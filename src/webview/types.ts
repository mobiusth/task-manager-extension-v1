import type { JSONContent } from '@tiptap/react';

export type RichTextContent = JSONContent & {
  type: 'doc';
};

export type Task = {
  id: string;
  category: string;
  startDate: string;
  expectedEndDate: string;
  priority: TaskPriority;
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

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type TaskSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

export type WebviewInboundMessage = {
  action: 'tasksLoaded';
  tasks: Task[];
  selectedId?: string;
};

export type WebviewOutboundMessage =
  | { action: 'loadTasks' }
  | { action: 'createTask'; task: TaskDraft }
  | { action: 'updateTask'; task: Task }
  | { action: 'deleteTask'; id: string }
  | { action: 'toggleTaskCompleted'; id: string; completed: boolean }
  | { action: 'openExternal'; url: string };

export type RichField = 'overview' | 'progress' | 'links' | 'mails';
