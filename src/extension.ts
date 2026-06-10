import * as vscode from 'vscode';

type RichTextContent = {
  type: 'doc';
  content?: RichTextNode[];
};

type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
};

type Task = {
  id: string;
  category: string;
  startDate: string;
  expectedEndDate: string;
  priority: number;
  schedule: TaskSchedule;
  tags: string[];
  completed: boolean;
  overview: RichTextContent;
  progress: RichTextContent;
  links: RichTextContent;
  mails: RichTextContent;
  createdAt: string;
  updatedAt: string;
};

type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
type TaskSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

type WebviewMessage =
  | { action: 'loadTasks' }
  | { action: 'createTask'; task: TaskDraft }
  | { action: 'updateTask'; task: Task }
  | { action: 'deleteTask'; id: string }
  | { action: 'toggleTaskCompleted'; id: string; completed: boolean }
  | { action: 'openExternal'; url: string };

const STORAGE_FILE = 'tasks.json';
const LEGACY_WORKSPACE_STORAGE_DIR = '.task-manager';
const TASK_MANAGER_VIEW_ID = 'taskManager.tasksView';

export function activate(context: vscode.ExtensionContext) {
  const provider = new TaskManagerViewProvider(context);
  const viewProvider = vscode.window.registerWebviewViewProvider(TASK_MANAGER_VIEW_ID, provider, {
    webviewOptions: {
      retainContextWhenHidden: true
    }
  });

  const disposable = vscode.commands.registerCommand('taskManager.open', async () => {
    await vscode.commands.executeCommand(`${TASK_MANAGER_VIEW_ID}.focus`);
  });

  context.subscriptions.push(viewProvider, disposable);
}

class TaskManagerViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')]
    };

    const repository = new TaskRepository(
      this.context.globalStorageUri,
      this.context.extensionUri,
      getWorkspaceFolder()?.uri
    );
    await repository.ensureInitialized();
    webviewView.webview.html = await getWebviewHtml(webviewView.webview, this.context.extensionUri);

    const postTasks = async (selectedId?: string) => {
      const tasks = await repository.readTasks();
      await webviewView.webview.postMessage({ action: 'tasksLoaded', tasks, selectedId });
    };

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      try {
        await handleWebviewMessage(message, repository, postTasks);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Task Manager 오류: ${messageText}`);
      }
    });
  }
}

async function handleWebviewMessage(
  message: WebviewMessage,
  repository: TaskRepository,
  postTasks: (selectedId?: string) => Promise<void>
): Promise<void> {
  switch (message.action) {
    case 'loadTasks':
      await postTasks();
      break;
    case 'createTask': {
      const created = await repository.createTask(message.task);
      await postTasks(created.id);
      break;
    }
    case 'updateTask': {
      const updated = await repository.updateTask(message.task);
      await postTasks(updated.id);
      break;
    }
    case 'deleteTask':
      await repository.deleteTask(message.id);
      await postTasks();
      break;
    case 'toggleTaskCompleted':
      await repository.toggleCompleted(message.id, message.completed);
      await postTasks(message.id);
      break;
    case 'openExternal':
      await openExternalUrl(message.url);
      break;
  }
}

async function openExternalUrl(url: string): Promise<void> {
  const uri = vscode.Uri.parse(url);
  if (uri.scheme !== 'http' && uri.scheme !== 'https') {
    throw new Error('http 또는 https 링크만 열 수 있습니다.');
  }

  await vscode.env.openExternal(uri);
}

export function deactivate() {}

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

class TaskRepository {
  constructor(
    private readonly storageUri: vscode.Uri,
    private readonly extensionUri: vscode.Uri,
    private readonly legacyWorkspaceUri?: vscode.Uri
  ) {}

  async ensureInitialized(): Promise<void> {
    try {
      await vscode.workspace.fs.stat(this.storageFileUri);
    } catch {
      await vscode.workspace.fs.createDirectory(this.storageUri);
      const migratedTasks = await this.readLegacyWorkspaceTasks();
      await this.writeTasks(migratedTasks.length > 0 ? migratedTasks : [await this.createSampleTask()]);
    }
  }

  async readTasks(): Promise<Task[]> {
    await this.ensureInitialized();

    const data = await vscode.workspace.fs.readFile(this.storageFileUri);
    const text = Buffer.from(data).toString('utf8');
    const parsed = JSON.parse(text) as Partial<Task>[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredTask) : [];
  }

  async createTask(draft: TaskDraft): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      ...normalizeDraft(draft),
      id: createId(),
      createdAt: now,
      updatedAt: now
    };
    const tasks = await this.readTasks();
    await this.writeTasks([task, ...tasks]);
    return task;
  }

  async updateTask(task: Task): Promise<Task> {
    const tasks = await this.readTasks();
    const now = new Date().toISOString();
    const updated: Task = {
      ...normalizeDraft(task),
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: now
    };
    const nextTasks = tasks.map((current) => current.id === updated.id ? updated : current);

    if (!nextTasks.some((current) => current.id === updated.id)) {
      throw new Error('수정할 task를 찾을 수 없습니다.');
    }

    await this.writeTasks(nextTasks);
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.readTasks();
    await this.writeTasks(tasks.filter((task) => task.id !== id));
  }

  async toggleCompleted(id: string, completed: boolean): Promise<void> {
    const tasks = await this.readTasks();
    const now = new Date().toISOString();
    await this.writeTasks(tasks.map((task) => task.id === id ? { ...task, completed, updatedAt: now } : task));
  }

  private async writeTasks(tasks: Task[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);
    const data = Buffer.from(JSON.stringify(tasks, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(this.storageFileUri, data);
  }

  private async createSampleTask(): Promise<Task> {
    const now = new Date().toISOString();
    const sample = await this.readTaskExample();

    return {
      id: createId(),
      category: sample.category || 'UEM',
      startDate: sample.startDate || '2026-06-10',
      expectedEndDate: sample.expectedEndDate || '2026-06-17',
      priority: sample.priority || 3,
      schedule: sample.schedule || 'none',
      tags: sample.tags || ['UEM'],
      completed: false,
      overview: sample.overview || textToRichContent('UEM v2.0 개발 및 배포'),
      progress: sample.progress || textToRichContent('(진행중) 개발팀에서 기능 개선 작업 중'),
      links: sample.links || textToRichContent('[UEM v2.0 개발 문서](https://example.com/uem-v2-docs)'),
      mails: sample.mails || textToRichContent('4/26, VVV - UEM v2.0 개발 시작 안내'),
      createdAt: now,
      updatedAt: now
    };
  }

  private async readTaskExample(): Promise<Partial<TaskDraft>> {
    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, 'task_examples'));
      return parseTaskExample(Buffer.from(data).toString('utf8'));
    } catch {
      return {};
    }
  }

  private async readLegacyWorkspaceTasks(): Promise<Task[]> {
    if (!this.legacyWorkspaceUri) {
      return [];
    }

    try {
      const legacyStorageUri = vscode.Uri.joinPath(this.legacyWorkspaceUri, LEGACY_WORKSPACE_STORAGE_DIR, STORAGE_FILE);
      const data = await vscode.workspace.fs.readFile(legacyStorageUri);
      const parsed = JSON.parse(Buffer.from(data).toString('utf8')) as Partial<Task>[];
      return Array.isArray(parsed) ? parsed.map(normalizeStoredTask) : [];
    } catch {
      return [];
    }
  }

  private get storageFileUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.storageUri, STORAGE_FILE);
  }
}

function normalizeDraft(task: TaskDraft): TaskDraft {
  return {
    category: task.category.trim(),
    startDate: task.startDate.trim(),
    expectedEndDate: task.expectedEndDate.trim(),
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: normalizeTags(task.tags),
    completed: Boolean(task.completed),
    overview: normalizeRichContent(task.overview),
    progress: normalizeRichContent(task.progress),
    links: normalizeRichContent(task.links),
    mails: normalizeRichContent(task.mails)
  };
}

function normalizeStoredTask(task: Partial<Task>): Task {
  const now = new Date().toISOString();

  return {
    id: task.id || createId(),
    category: task.category?.trim() || '',
    startDate: task.startDate?.trim() || '',
    expectedEndDate: task.expectedEndDate?.trim() || '',
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: normalizeTags(task.tags),
    completed: Boolean(task.completed),
    overview: normalizeRichContent(task.overview),
    progress: normalizeRichContent(task.progress),
    links: normalizeRichContent(task.links),
    mails: normalizeRichContent(task.mails),
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now
  };
}

function normalizePriority(priority: unknown): number {
  const value = Number(priority);
  if (!Number.isFinite(value)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(value)));
}

function normalizeSchedule(schedule: unknown): TaskSchedule {
  return schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly' ? schedule : 'none';
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)));
}

function normalizeRichContent(value: unknown): RichTextContent {
  if (typeof value === 'string') {
    return textToRichContent(value);
  }

  if (isRichContent(value)) {
    return value;
  }

  return textToRichContent('');
}

function isRichContent(value: unknown): value is RichTextContent {
  return Boolean(value && typeof value === 'object' && (value as { type?: unknown }).type === 'doc');
}

function textToRichContent(text: string): RichTextContent {
  const lines = text.trim() ? text.split(/\r?\n/) : [''];

  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : undefined
    }))
  };
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseTaskExample(text: string): Partial<TaskDraft> {
  const sections = new Map<string, string[]>();
  let currentSection = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const sectionMatch = line.match(/^- ([^-].*)$/);

    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections.set(currentSection, []);
      continue;
    }

    if (!currentSection || !line.trim()) {
      continue;
    }

    const item = line.replace(/^\s*-\s?/, '').trim();
    if (item) {
      sections.get(currentSection)?.push(item);
    }
  }

  return {
    category: first(sections.get('category')),
    startDate: first(sections.get('시작 시간')),
    expectedEndDate: first(sections.get('예상 완료 시간')),
    overview: textToRichContent(joinSection(sections.get('개요'))),
    progress: textToRichContent(joinSection(sections.get('진행상황'))),
    links: textToRichContent(joinSection(sections.get('관련 링크'))),
    mails: textToRichContent(joinSection(sections.get('관련 메일'))),
    completed: false
  };
}

function first(values: string[] | undefined): string {
  return values?.[0] ?? '';
}

function joinSection(values: string[] | undefined): string {
  return values?.join('\n') ?? '';
}

async function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
  const nonce = createNonce();
  const assetsUri = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'assets');
  const assets = await vscode.workspace.fs.readDirectory(assetsUri);
  const scripts = assets
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.js'))
    .map(([name]) => webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, name)));
  const styles = assets
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.css'))
    .map(([name]) => webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, name)));
  const styleTags = styles.map((uri) => `<link rel="stylesheet" href="${uri}">`).join('\n');
  const scriptTags = scripts.map((uri) => `<script type="module" nonce="${nonce}" src="${uri}"></script>`).join('\n');

  return /* html */ `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Task Manager</title>
  ${styleTags}
</head>
<body>
  <div id="root"></div>
  ${scriptTags}
</body>
</html>`;
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
