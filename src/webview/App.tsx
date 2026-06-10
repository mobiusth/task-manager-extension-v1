import { useEffect, useMemo, useState } from 'react';
import type { Task, TaskDraft, WebviewInboundMessage } from './types';
import { emptyRichText, normalizeRichText } from './richText';
import { vscode } from './vscode';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';

function createEmptyDraft(): TaskDraft {
  return {
    category: '',
    startDate: todayDateInputValue(),
    expectedEndDate: '',
    priority: 3,
    schedule: 'none',
    tags: [],
    completed: false,
    overview: emptyRichText,
    progress: emptyRichText,
    links: emptyRichText,
    mails: emptyRichText
  };
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(createEmptyDraft);
  const [status, setStatus] = useState('');

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId), [selectedId, tasks]);

  useEffect(() => {
    const listener = (event: MessageEvent<WebviewInboundMessage>) => {
      if (event.data.action !== 'tasksLoaded') {
        return;
      }

      const nextTasks = event.data.tasks.map(normalizeTask);
      const nextSelectedId = event.data.selectedId || selectedId || nextTasks[0]?.id || null;
      const validSelectedId = nextTasks.some((task) => task.id === nextSelectedId) ? nextSelectedId : nextTasks[0]?.id || null;
      const nextSelectedTask = nextTasks.find((task) => task.id === validSelectedId);

      setTasks(nextTasks);
      setSelectedId(validSelectedId);
      setDraft(nextSelectedTask ? taskToDraft(nextSelectedTask) : createEmptyDraft());
      flashStatus('저장되었습니다.');
    };

    window.addEventListener('message', listener);
    vscode?.postMessage({ action: 'loadTasks' });

    return () => window.removeEventListener('message', listener);
  }, []);

  const createNewTask = () => {
    setSelectedId(null);
    setDraft(createEmptyDraft());
  };

  const selectTask = (id: string) => {
    const task = tasks.find((current) => current.id === id);
    setSelectedId(id);
    setDraft(task ? taskToDraft(task) : createEmptyDraft());
  };

  const saveTask = () => {
    if (!selectedTask) {
      vscode?.postMessage({ action: 'createTask', task: draft });
      return;
    }

    vscode?.postMessage({
      action: 'updateTask',
      task: {
        ...selectedTask,
        ...draft
      }
    });
  };

  const cancelEdit = () => {
    setDraft(selectedTask ? taskToDraft(selectedTask) : createEmptyDraft());
    flashStatus('변경을 취소했습니다.');
  };

  const deleteTask = (id: string) => {
    vscode?.postMessage({ action: 'deleteTask', id });
  };

  const toggleCompleted = (id: string, completed: boolean) => {
    vscode?.postMessage({ action: 'toggleTaskCompleted', id, completed });
  };

  const flashStatus = (text: string) => {
    setStatus(text);
    window.setTimeout(() => setStatus(''), 1800);
  };

  return (
    <div className="app">
      <TaskList
        tasks={tasks}
        selectedId={selectedId}
        onSelect={selectTask}
        onCreate={createNewTask}
        onDelete={deleteTask}
        onToggleCompleted={toggleCompleted}
      />
      <TaskForm
        draft={draft}
        selectedTask={selectedTask}
        onDraftChange={setDraft}
        onSave={saveTask}
        onCancel={cancelEdit}
        onDelete={deleteTask}
      />
      <div className="status" role="status">{status}</div>
    </div>
  );
}

function todayDateInputValue(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: task.tags || [],
    overview: normalizeRichText(task.overview),
    progress: normalizeRichText(task.progress),
    links: normalizeRichText(task.links),
    mails: normalizeRichText(task.mails)
  };
}

function taskToDraft(task: Task): TaskDraft {
  return {
    category: task.category,
    startDate: task.startDate,
    expectedEndDate: task.expectedEndDate,
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: task.tags || [],
    completed: task.completed,
    overview: normalizeRichText(task.overview),
    progress: normalizeRichText(task.progress),
    links: normalizeRichText(task.links),
    mails: normalizeRichText(task.mails)
  };
}

function normalizePriority(priority: Task['priority']): Task['priority'] {
  const value = Number(priority);
  if (!Number.isFinite(value)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(value))) as Task['priority'];
}

function normalizeSchedule(schedule: Task['schedule']): Task['schedule'] {
  return schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly' ? schedule : 'none';
}
