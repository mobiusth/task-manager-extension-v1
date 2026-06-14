import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task, TaskDraft, WebviewInboundMessage } from './types';
import { createTaskContentTemplate, normalizeRichText } from './richText';
import { todayDateInputValue } from './dateUtils';
import { vscode } from './vscode';
import { TaskList } from './components/TaskList';
import { TaskForm, type TaskFormHandle } from './components/TaskForm';

function createEmptyDraft(): TaskDraft {
  return {
    category: '',
    description: '',
    startDate: todayDateInputValue(),
    expectedEndDate: '',
    priority: 3,
    schedule: 'none',
    tags: [],
    completed: false,
    content: createTaskContentTemplate()
  };
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(createEmptyDraft);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formFocusTarget, setFormFocusTarget] = useState<'category' | 'content' | null>(null);
  const [visibleTaskIds, setVisibleTaskIds] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const taskFormRef = useRef<TaskFormHandle>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId), [selectedId, tasks]);

  useEffect(() => {
    const listener = (event: MessageEvent<WebviewInboundMessage>) => {
      if (event.data.action !== 'tasksLoaded') {
        return;
      }

      const nextTasks = event.data.tasks.map(normalizeTask);
      const nextSelectedId = event.data.selectedId || selectedId || null;
      const validSelectedId = nextSelectedId && nextTasks.some((task) => task.id === nextSelectedId) ? nextSelectedId : null;
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
    setIsFormOpen(true);
    setFormFocusTarget('category');
  };

  const selectTask = (id: string) => {
    const task = tasks.find((current) => current.id === id);
    setSelectedId(id);
    setDraft(task ? taskToDraft(task) : createEmptyDraft());
    setIsFormOpen(true);
  };

  const focusTaskCategory = (id: string) => {
    selectTask(id);
    setFormFocusTarget('category');
  };

  const editTaskContent = (id: string) => {
    selectTask(id);
    setFormFocusTarget('content');
  };

  const focusLastVisibleTask = () => {
    const lastTaskId = visibleTaskIds[visibleTaskIds.length - 1];
    if (!lastTaskId) {
      return;
    }

    selectTask(lastTaskId);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-task-id="${lastTaskId}"]`);
      element?.focus();
    });
  };

  const focusFirstVisibleTask = () => {
    const firstTaskId = visibleTaskIds[0];
    if (!firstTaskId) {
      return;
    }

    selectTask(firstTaskId);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-task-id="${firstTaskId}"]`);
      element?.focus();
    });
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNewTask();
        return;
      }

      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'Home') {
        event.preventDefault();
        focusFirstVisibleTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleTaskIds, tasks]);

  return (
    <div className="app">
      <TaskList
        tasks={tasks}
        selectedId={selectedId}
        onSelect={selectTask}
        onCreate={createNewTask}
        onDelete={deleteTask}
        onToggleCompleted={toggleCompleted}
        onFocusTaskCategory={focusTaskCategory}
        onEditTaskContent={editTaskContent}
        onVisibleTaskIdsChange={setVisibleTaskIds}
      />
      <TaskForm
        ref={taskFormRef}
        draft={draft}
        isOpen={isFormOpen}
        selectedTask={selectedTask}
        onDraftChange={setDraft}
        onToggleOpen={() => setIsFormOpen((current) => !current)}
        onSave={saveTask}
        onCancel={cancelEdit}
        onDelete={deleteTask}
        focusTarget={formFocusTarget}
        onFocusHandled={() => setFormFocusTarget(null)}
        onFocusLastTask={focusLastVisibleTask}
      />
      <div className="status" role="status">{status}</div>
    </div>
  );
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    description: task.description || task.category || '',
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: task.tags || [],
    content: normalizeRichText(task.content)
  };
}

function taskToDraft(task: Task): TaskDraft {
  return {
    category: task.category,
    description: task.description || task.category || '',
    startDate: task.startDate,
    expectedEndDate: task.expectedEndDate,
    priority: normalizePriority(task.priority),
    schedule: normalizeSchedule(task.schedule),
    tags: task.tags || [],
    completed: task.completed,
    content: normalizeRichText(task.content)
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
