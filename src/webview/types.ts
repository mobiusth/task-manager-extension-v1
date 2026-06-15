import type { JSONContent } from '@tiptap/react';

export type RichTextContent = JSONContent & {
  type: 'doc';
};

export type Task = {
  id: string;
  category: string;
  description: string;
  startDate: string;
  expectedEndDate: string;
  priority: TaskPriority;
  schedule: TaskSchedule;
  tags: string[];
  completed: boolean;
  content: RichTextContent;
  createdAt: string;
  updatedAt: string;
};

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type TaskSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

export type WorkTip = {
  id: string;
  title: string;
  tags: string[];
  content: RichTextContent;
  createdAt: string;
  updatedAt: string;
};

export type WorkTipDraft = Omit<WorkTip, 'id' | 'createdAt' | 'updatedAt'>;

export type WebviewInboundMessage =
  | {
    action: 'tasksLoaded';
    tasks: Task[];
    selectedId?: string;
  }
  | {
    action: 'tipsLoaded';
    tips: WorkTip[];
    selectedId?: string;
  };

export type WebviewOutboundMessage =
  | { action: 'loadTasks' }
  | { action: 'createTask'; task: TaskDraft }
  | { action: 'updateTask'; task: Task }
  | { action: 'deleteTask'; id: string }
  | { action: 'toggleTaskCompleted'; id: string; completed: boolean }
  | { action: 'loadTips' }
  | { action: 'createTip'; tip: WorkTipDraft }
  | { action: 'updateTip'; tip: WorkTip }
  | { action: 'deleteTip'; id: string }
  | { action: 'openExternal'; url: string };
