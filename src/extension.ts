import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

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
  category: string[];
  description: string;
  startDate: string;
  expectedEndDate: string;
  priority: number;
  schedule: TaskSchedule;
  tags: string[];
  completed: boolean;
  content: RichTextContent;
  createdAt: string;
  updatedAt: string;
};

type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
type TaskSchedule = 'none' | 'daily' | 'weekly' | 'monthly';
type WorkTip = {
  id: string;
  category: string[];
  title: string;
  tags: string[];
  content: RichTextContent;
  createdAt: string;
  updatedAt: string;
};

type WorkTipDraft = Omit<WorkTip, 'id' | 'createdAt' | 'updatedAt'>;
type LegacyWorkTip = Partial<Omit<WorkTip, 'category'>> & { category?: string[] | string };
type LegacyTask = Partial<Omit<Task, 'category'>> & {
  category?: string[] | string;
  overview?: unknown;
  progress?: unknown;
  links?: unknown;
  mails?: unknown;
};

type WebviewMessage =
  | { action: 'loadTasks' }
  | { action: 'createTask'; task: TaskDraft }
  | { action: 'updateTask'; task: Task }
  | { action: 'deleteTask'; id: string }
  | { action: 'toggleTaskCompleted'; id: string; completed: boolean }
  | { action: 'loadTips' }
  | { action: 'createTip'; tip: WorkTipDraft }
  | { action: 'updateTip'; tip: WorkTip }
  | { action: 'deleteTip'; id: string }
  | { action: 'swapDebugData'; keyword: string }
  | { action: 'openExternal'; url: string };

const TASKS_STORAGE_FILE = 'tasks.json';
const TIPS_STORAGE_FILE = 'tips.json';
const USER_TASKS_STORAGE_FILE = 'tasks.user.json';
const USER_TIPS_STORAGE_FILE = 'tips.user.json';
const DEBUG_TASKS_STORAGE_FILE = 'tasks.debug.json';
const DEBUG_TIPS_STORAGE_FILE = 'tips.debug.json';
const DEBUG_STATE_STORAGE_FILE = 'debug-state.json';
const USER_DATA_STORAGE_DIR = '.task-manager-extension-v1';
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

  const debugDisposable = vscode.commands.registerCommand('taskManager.swapDebugData', async () => {
    try {
      await provider.promptAndSwapDebugData();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Task Manager debug swap failed: ${messageText}`);
    }
  });

  context.subscriptions.push(viewProvider, disposable, debugDisposable);
}

class TaskManagerViewProvider implements vscode.WebviewViewProvider {
  private webviewView?: vscode.WebviewView;
  private repository?: TaskRepository;
  private tipRepository?: TipRepository;
  private debugDataManager?: DebugDataManager;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')]
    };

    const { repository, tipRepository, debugDataManager } = createDataManagers(this.context);
    this.repository = repository;
    this.tipRepository = tipRepository;
    this.debugDataManager = debugDataManager;
    await repository.ensureInitialized();
    await tipRepository.ensureInitialized();
    webviewView.webview.html = await getWebviewHtml(webviewView.webview, this.context.extensionUri);

    const postTasks = async (selectedId?: string) => {
      const tasks = await repository.readTasks();
      await webviewView.webview.postMessage({ action: 'tasksLoaded', tasks, selectedId });
    };

    const postTips = async (selectedId?: string) => {
      const tips = await tipRepository.readTips();
      await webviewView.webview.postMessage({ action: 'tipsLoaded', tips, selectedId });
    };

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      try {
        await handleWebviewMessage(message, repository, tipRepository, debugDataManager, postTasks, postTips);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Task Manager 오류: ${messageText}`);
      }
    });
  }

  async promptAndSwapDebugData(): Promise<void> {
    const keyword = await vscode.window.showInputBox({
      prompt: 'Type "debug" to swap test data.',
      placeHolder: 'debug',
      ignoreFocusOut: true
    });

    if (keyword === undefined) {
      return;
    }

    const managers = await this.getDataManagers();
    await managers.debugDataManager.swap(keyword);
    await this.postCurrentData();
    vscode.window.showInformationMessage('Task Manager debug data was swapped.');
  }

  private async getDataManagers(): Promise<{ repository: TaskRepository; tipRepository: TipRepository; debugDataManager: DebugDataManager }> {
    if (this.repository && this.tipRepository && this.debugDataManager) {
      return {
        repository: this.repository,
        tipRepository: this.tipRepository,
        debugDataManager: this.debugDataManager
      };
    }

    const managers = createDataManagers(this.context);
    this.repository = managers.repository;
    this.tipRepository = managers.tipRepository;
    this.debugDataManager = managers.debugDataManager;
    await managers.repository.ensureInitialized();
    await managers.tipRepository.ensureInitialized();
    return managers;
  }

  private async postCurrentData(): Promise<void> {
    if (!this.webviewView || !this.repository || !this.tipRepository) {
      return;
    }

    const tasks = await this.repository.readTasks();
    const tips = await this.tipRepository.readTips();
    await this.webviewView.webview.postMessage({ action: 'tasksLoaded', tasks });
    await this.webviewView.webview.postMessage({ action: 'tipsLoaded', tips });
  }
}

function createDataManagers(context: vscode.ExtensionContext): {
  repository: TaskRepository;
  tipRepository: TipRepository;
  debugDataManager: DebugDataManager;
} {
  const storageUri = getUserDataStorageUri();
  const repository = new TaskRepository(
    storageUri,
    getWorkspaceFolder()?.uri,
    context.globalStorageUri
  );
  const tipRepository = new TipRepository(storageUri, context.globalStorageUri);
  const debugDataManager = new DebugDataManager(storageUri, repository, tipRepository);
  return { repository, tipRepository, debugDataManager };
}

async function handleWebviewMessage(
  message: WebviewMessage,
  repository: TaskRepository,
  tipRepository: TipRepository,
  debugDataManager: DebugDataManager,
  postTasks: (selectedId?: string) => Promise<void>,
  postTips: (selectedId?: string) => Promise<void>
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
    case 'loadTips':
      await postTips();
      break;
    case 'createTip': {
      const created = await tipRepository.createTip(message.tip);
      await postTips(created.id);
      break;
    }
    case 'updateTip': {
      const updated = await tipRepository.updateTip(message.tip);
      await postTips(updated.id);
      break;
    }
    case 'deleteTip':
      await tipRepository.deleteTip(message.id);
      await postTips();
      break;
    case 'swapDebugData':
      await debugDataManager.swap(message.keyword);
      await postTasks();
      await postTips();
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

function getUserDataStorageUri(): vscode.Uri {
  return vscode.Uri.file(path.join(os.homedir(), USER_DATA_STORAGE_DIR));
}

class TaskRepository {
  constructor(
    private readonly storageUri: vscode.Uri,
    private readonly legacyWorkspaceUri?: vscode.Uri,
    private readonly legacyExtensionStorageUri?: vscode.Uri
  ) {}

  async ensureInitialized(): Promise<void> {
    try {
      await vscode.workspace.fs.stat(this.storageFileUri);
    } catch {
      await vscode.workspace.fs.createDirectory(this.storageUri);
      const migratedTasks = await this.readLegacyExtensionTasks();
      await this.writeTasks(migratedTasks ?? []);
    }
  }

  async readTasks(): Promise<Task[]> {
    await this.ensureInitialized();

    const data = await vscode.workspace.fs.readFile(this.storageFileUri);
    const text = Buffer.from(data).toString('utf8');
    const parsed = JSON.parse(text) as LegacyTask[];
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

  async replaceTasks(tasks: Task[]): Promise<void> {
    await this.writeTasks(tasks.map(normalizeStoredTask));
  }

  private async writeTasks(tasks: Task[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);
    const data = Buffer.from(JSON.stringify(tasks, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(this.storageFileUri, data);
  }

  private async createSampleTask(): Promise<unknown> {
    const now = new Date().toISOString();
    const sample = await this.readTaskExample();

    return {
      id: createId(),
      category: ['UEM', 'Release'],
      description: sample.description || sample.category || 'UEM v2.0 개발 및 배포',
      startDate: sample.startDate || '2026-06-10',
      expectedEndDate: sample.expectedEndDate || '2026-06-17',
      priority: sample.priority || 3,
      schedule: sample.schedule || 'none',
      tags: sample.tags || ['UEM', 'QA'],
      completed: false,
      content: sample.content || createTaskContentTemplate(),
      createdAt: now,
      updatedAt: now
    };
  }

  private async readTaskExample(): Promise<Partial<TaskDraft>> {
    return {};
  }

  private async readLegacyWorkspaceTasks(): Promise<Task[]> {
    if (!this.legacyWorkspaceUri) {
      return [];
    }

    try {
      const legacyStorageUri = vscode.Uri.joinPath(this.legacyWorkspaceUri, LEGACY_WORKSPACE_STORAGE_DIR, TASKS_STORAGE_FILE);
      const data = await vscode.workspace.fs.readFile(legacyStorageUri);
      const parsed = JSON.parse(Buffer.from(data).toString('utf8')) as LegacyTask[];
      return Array.isArray(parsed) ? parsed.map(normalizeStoredTask) : [];
    } catch {
      return [];
    }
  }

  private async readLegacyExtensionTasks(): Promise<Task[] | undefined> {
    const extensionTasks = await this.readTasksFromUri(this.legacyExtensionStorageUri);
    if (extensionTasks) {
      return extensionTasks;
    }

    const workspaceTasks = await this.readLegacyWorkspaceTasks();
    return workspaceTasks.length > 0 ? workspaceTasks : undefined;
  }

  private async readTasksFromUri(storageUri: vscode.Uri | undefined): Promise<Task[] | undefined> {
    if (!storageUri) {
      return undefined;
    }

    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(storageUri, TASKS_STORAGE_FILE));
      const parsed = JSON.parse(Buffer.from(data).toString('utf8')) as LegacyTask[];
      return Array.isArray(parsed) ? parsed.map(normalizeStoredTask) : [];
    } catch {
      return undefined;
    }
  }

  private get storageFileUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.storageUri, TASKS_STORAGE_FILE);
  }
}

class TipRepository {
  constructor(
    private readonly storageUri: vscode.Uri,
    private readonly legacyExtensionStorageUri?: vscode.Uri
  ) {}

  async ensureInitialized(): Promise<void> {
    try {
      await vscode.workspace.fs.stat(this.storageFileUri);
    } catch {
      const migratedTips = await this.readLegacyExtensionTips();
      await this.writeTips(migratedTips);
    }
  }

  async readTips(): Promise<WorkTip[]> {
    await this.ensureInitialized();

    const data = await vscode.workspace.fs.readFile(this.storageFileUri);
    const text = Buffer.from(data).toString('utf8');
    const parsed = JSON.parse(text) as LegacyWorkTip[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredTip) : [];
  }

  async createTip(draft: WorkTipDraft): Promise<WorkTip> {
    const now = new Date().toISOString();
    const tip: WorkTip = {
      ...normalizeTipDraft(draft),
      id: createId(),
      createdAt: now,
      updatedAt: now
    };
    const tips = await this.readTips();
    await this.writeTips([tip, ...tips]);
    return tip;
  }

  async updateTip(tip: WorkTip): Promise<WorkTip> {
    const tips = await this.readTips();
    const now = new Date().toISOString();
    const updated: WorkTip = {
      ...normalizeTipDraft(tip),
      id: tip.id,
      createdAt: tip.createdAt,
      updatedAt: now
    };
    const nextTips = tips.map((current) => current.id === updated.id ? updated : current);

    if (!nextTips.some((current) => current.id === updated.id)) {
      throw new Error('Tip to update was not found.');
    }

    await this.writeTips(nextTips);
    return updated;
  }

  async deleteTip(id: string): Promise<void> {
    const tips = await this.readTips();
    await this.writeTips(tips.filter((tip) => tip.id !== id));
  }

  async replaceTips(tips: WorkTip[]): Promise<void> {
    await this.writeTips(tips.map(normalizeStoredTip));
  }

  private async writeTips(tips: WorkTip[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);
    const data = Buffer.from(JSON.stringify(tips, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(this.storageFileUri, data);
  }

  private async readLegacyExtensionTips(): Promise<WorkTip[]> {
    if (!this.legacyExtensionStorageUri) {
      return [];
    }

    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.legacyExtensionStorageUri, TIPS_STORAGE_FILE));
      const parsed = JSON.parse(Buffer.from(data).toString('utf8')) as LegacyWorkTip[];
      return Array.isArray(parsed) ? parsed.map(normalizeStoredTip) : [];
    } catch {
      return [];
    }
  }

  private get storageFileUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.storageUri, TIPS_STORAGE_FILE);
  }
}

type DebugState = {
  active: boolean;
};

class DebugDataManager {
  constructor(
    private readonly storageUri: vscode.Uri,
    private readonly taskRepository: TaskRepository,
    private readonly tipRepository: TipRepository
  ) {}

  async swap(keyword: string): Promise<void> {
    if (keyword.trim() !== 'debug') {
      throw new Error('Debug data swap requires the exact keyword "debug".');
    }

    await vscode.workspace.fs.createDirectory(this.storageUri);
    const state = await this.readState();

    if (state.active) {
      const currentDebugTasks = await this.taskRepository.readTasks();
      const currentDebugTips = await this.tipRepository.readTips();
      await writeJson(vscode.Uri.joinPath(this.storageUri, DEBUG_TASKS_STORAGE_FILE), currentDebugTasks);
      await writeJson(vscode.Uri.joinPath(this.storageUri, DEBUG_TIPS_STORAGE_FILE), currentDebugTips);

      const userTasks = await readJson<LegacyTask[]>(vscode.Uri.joinPath(this.storageUri, USER_TASKS_STORAGE_FILE)) ?? [];
      const userTips = await readJson<LegacyWorkTip[]>(vscode.Uri.joinPath(this.storageUri, USER_TIPS_STORAGE_FILE)) ?? [];
      await this.taskRepository.replaceTasks(userTasks.map(normalizeStoredTask));
      await this.tipRepository.replaceTips(userTips.map(normalizeStoredTip));
      await this.writeState({ active: false });
      return;
    }

    const currentUserTasks = await this.taskRepository.readTasks();
    const currentUserTips = await this.tipRepository.readTips();
    await writeJson(vscode.Uri.joinPath(this.storageUri, USER_TASKS_STORAGE_FILE), currentUserTasks);
    await writeJson(vscode.Uri.joinPath(this.storageUri, USER_TIPS_STORAGE_FILE), currentUserTips);

    const debugTasks = await readJson<LegacyTask[]>(vscode.Uri.joinPath(this.storageUri, DEBUG_TASKS_STORAGE_FILE)) ?? createSampleTasks();
    const debugTips = await readJson<LegacyWorkTip[]>(vscode.Uri.joinPath(this.storageUri, DEBUG_TIPS_STORAGE_FILE)) ?? createSampleTips();
    await this.taskRepository.replaceTasks(debugTasks.map(normalizeStoredTask));
    await this.tipRepository.replaceTips(debugTips.map(normalizeStoredTip));
    await this.writeState({ active: true });
  }

  private async readState(): Promise<DebugState> {
    return await readJson<DebugState>(vscode.Uri.joinPath(this.storageUri, DEBUG_STATE_STORAGE_FILE)) ?? { active: false };
  }

  private async writeState(state: DebugState): Promise<void> {
    await writeJson(vscode.Uri.joinPath(this.storageUri, DEBUG_STATE_STORAGE_FILE), state);
  }
}

function normalizeDraft(task: TaskDraft): TaskDraft {
  return {
    category: normalizeCategories(task.category),
    description: task.description.trim(),
    startDate: task.startDate.trim(),
    expectedEndDate: task.expectedEndDate.trim(),
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: normalizeTags(task.tags),
    completed: Boolean(task.completed),
    content: normalizeRichContent(task.content)
  };
}

function normalizeStoredTask(task: LegacyTask): Task {
  const now = new Date().toISOString();
  const category = normalizeCategories(task.category);

  return {
    id: task.id || createId(),
    category,
    description: task.description?.trim() || category.join(', '),
    startDate: task.startDate?.trim() || '',
    expectedEndDate: task.expectedEndDate?.trim() || '',
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: normalizeTags(task.tags),
    completed: Boolean(task.completed),
    content: normalizeTaskContent(task),
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now
  };
}

function normalizeTipDraft(tip: WorkTipDraft): WorkTipDraft {
  return {
    category: normalizeCategories(tip.category),
    title: tip.title.trim(),
    tags: normalizeTags(tip.tags),
    content: normalizeRichContent(tip.content)
  };
}

function normalizeStoredTip(tip: LegacyWorkTip): WorkTip {
  const now = new Date().toISOString();

  return {
    id: tip.id || createId(),
    category: normalizeCategories(tip.category),
    title: tip.title?.trim() || '',
    tags: normalizeTags(tip.tags),
    content: normalizeRichContent(tip.content),
    createdAt: tip.createdAt || now,
    updatedAt: tip.updatedAt || now
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

function normalizeCategories(category: string[] | string | undefined): string[] {
  const values = Array.isArray(category) ? category : String(category || '').split(/[,/|;]/);
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

async function readJson<T>(uri: vscode.Uri): Promise<T | undefined> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(data).toString('utf8')) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(uri: vscode.Uri, value: unknown): Promise<void> {
  const data = Buffer.from(JSON.stringify(value, null, 2), 'utf8');
  await vscode.workspace.fs.writeFile(uri, data);
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

function normalizeTaskContent(task: LegacyTask): RichTextContent {
  if (isRichContent(task.content) || typeof task.content === 'string') {
    return normalizeRichContent(task.content);
  }

  const legacySections = [
    { label: '개요', value: task.overview },
    { label: '진행상황', value: task.progress },
    { label: '관련 링크', value: task.links },
    { label: '관련 메일', value: task.mails }
  ];

  if (legacySections.some((section) => richContentToPlainText(section.value))) {
    return createTaskContentFromSections(
      legacySections.map((section) => ({
        label: section.label,
        text: richContentToPlainText(section.value)
      }))
    );
  }

  return createTaskContentTemplate();
}

function isRichContent(value: unknown): value is RichTextContent {
  return Boolean(value && typeof value === 'object' && (value as { type?: unknown }).type === 'doc');
}

function createTaskContentTemplate(): RichTextContent {
  return createTaskContentFromSections([
    { label: '개요', text: '' },
    { label: '진행상황', text: '' },
    { label: '관련 링크', text: '' },
    { label: '관련 메일', text: '' }
  ]);
}

function createTaskContentFromSections(sections: Array<{ label: string; text: string }>): RichTextContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: sections.map(({ label, text }) => {
          const value = text.trim();
          return {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: value ? `${label} - ${value}` : label }]
              }
            ]
          };
        })
      }
    ]
  };
}

function richContentToPlainText(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (!isRichContent(value)) {
    return '';
  }

  return richNodeToPlainText(value).replace(/\s+/g, ' ').trim();
}

function richNodeToPlainText(node: RichTextContent | RichTextNode): string {
  const currentText = 'text' in node ? node.text || '' : '';
  const childText = (node.content || []).map(richNodeToPlainText).join(' ');
  return `${currentText} ${childText}`.trim();
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

function createSampleTasks(): Task[] {
  const now = new Date().toISOString();
  const taskCategories = ['Planning', 'Development', 'QA', 'Documentation', 'Release', 'Support'];
  const taskTags = ['Frontend', 'Backend', 'Review', 'Automation', 'Bugfix', 'Meeting'];
  const schedules: TaskSchedule[] = ['none', 'daily', 'weekly', 'monthly'];
  const tasks = [
    'Implement onboarding checklist',
    'Refine task search filters',
    'Write release verification plan',
    'Review keyboard shortcut coverage',
    'Prepare migration test matrix',
    'Add empty-state copy review',
    'Validate webview storage recovery',
    'Document extension install flow',
    'Build regression smoke checklist',
    'Triage task completion sync issue',
    'Prepare user feedback summary',
    'Improve rich editor undo cases',
    'Audit accessibility labels',
    'Update packaging notes',
    'Verify category filter behavior',
    'Create demo workspace scenario',
    'Review tip CRUD edge cases',
    'Stabilize date normalization tests',
    'Check external link handling',
    'Finalize sample data review'
  ];

  return tasks.map((description, index) => {
    const start = addDays('2026-07-01', index * 2);
    const duration = 7 + (index % 8);
    const category = [taskCategories[index % taskCategories.length], taskCategories[(index + 2) % taskCategories.length]];
    const tags = [taskTags[(index + 1) % taskTags.length], taskTags[(index + 4) % taskTags.length]];

    return {
      id: createId(),
      category,
      description,
      startDate: start,
      expectedEndDate: addDays(start, duration),
      priority: (index % 5) + 1,
      schedule: schedules[index % schedules.length],
      tags,
      completed: index % 6 === 0,
      content: textToRichContent([
        `Overview: ${description} for test data validation.`,
        `Progress: Confirm category ${category.join(' / ')} and tags ${tags.join(' / ')} are searchable.`,
        `Links: https://example.com/tasks/${index + 1}`,
        `Mail: Sample coordination note ${index + 1}.`
      ].join('\n')),
      createdAt: now,
      updatedAt: now
    };
  });
}

function createSampleTips(): WorkTip[] {
  const now = new Date().toISOString();
  const tipCategories = ['Workflow', 'Editor', 'Git', 'Testing', 'Communication', 'Deployment'];
  const tipTags = ['Shortcut', 'Checklist', 'Debugging', 'Review', 'Template', 'Productivity'];
  const tips = [
    'Keep task titles outcome based',
    'Use category filters during standup',
    'Write reproduction steps first',
    'Group related links in one paragraph',
    'Review keyboard flows before release',
    'Record migration assumptions',
    'Keep tags short and reusable',
    'Check empty lists after deletion',
    'Use weekly review for stale tasks',
    'Pin release notes beside QA results',
    'Capture decisions in the tip body',
    'Separate workaround from root cause',
    'Run smoke checks after packaging',
    'Keep support notes searchable',
    'Prefer one owner per active task',
    'Mention date formats in test notes',
    'Verify external links from preview',
    'Summarize feedback by category',
    'Create templates for repeated work',
    'Close completed tasks after review'
  ];

  return tips.map((title, index) => {
    const category = [tipCategories[index % tipCategories.length], tipCategories[(index + 3) % tipCategories.length]];
    const tags = [tipTags[(index + 2) % tipTags.length], tipTags[(index + 5) % tipTags.length]];

    return {
      id: createId(),
      category,
      title,
      tags,
      content: textToRichContent([
        `${title}.`,
        `Category: ${category.join(' / ')}.`,
        `Tags: ${tags.join(' / ')}.`,
        'Use this sample tip to validate filtering, search, editing, and preview rendering.'
      ].join('\n')),
      createdAt: now,
      updatedAt: new Date(Date.parse(now) + index * 60_000).toISOString()
    };
  });
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
    category: normalizeCategories(first(sections.get('category'))),
    description: first(sections.get('Task Description')) || first(sections.get('description')) || first(sections.get('개요')),
    startDate: first(sections.get('시작 시간')),
    expectedEndDate: first(sections.get('예상 완료 시간')),
    content: createTaskContentFromSections([
      { label: '개요', text: joinSection(sections.get('개요')) },
      { label: '진행상황', text: joinSection(sections.get('진행상황')) },
      { label: '관련 링크', text: joinSection(sections.get('관련 링크')) },
      { label: '관련 메일', text: joinSection(sections.get('관련 메일')) }
    ]),
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
