import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task, TaskDraft, WebviewInboundMessage, WorkTip, WorkTipDraft } from './types';
import { createTaskContentTemplate, emptyRichText, normalizeRichText } from './richText';
import { todayDateInputValue } from './dateUtils';
import { vscode } from './vscode';
import { TaskList } from './components/TaskList';
import { TaskForm, type TaskFormHandle } from './components/TaskForm';
import { TipList } from './components/TipList';
import { TipForm } from './components/TipForm';

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

function createEmptyTipDraft(): WorkTipDraft {
  return {
    title: '',
    tags: [],
    content: emptyRichText
  };
}

export function App() {
  const [activeView, setActiveView] = useState<'tasks' | 'tips'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(createEmptyDraft);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formFocusTarget, setFormFocusTarget] = useState<'description' | 'category' | 'content' | null>(null);
  const [visibleTaskIds, setVisibleTaskIds] = useState<string[]>([]);
  const [tips, setTips] = useState<WorkTip[]>([]);
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null);
  const [tipDraft, setTipDraft] = useState<WorkTipDraft>(createEmptyTipDraft);
  const [tipSearchQuery, setTipSearchQuery] = useState('');
  const [visibleTipIds, setVisibleTipIds] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const taskFormRef = useRef<TaskFormHandle>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId), [selectedId, tasks]);
  const selectedTip = useMemo(() => tips.find((tip) => tip.id === selectedTipId), [selectedTipId, tips]);

  useEffect(() => {
    const listener = (event: MessageEvent<WebviewInboundMessage>) => {
      if (event.data.action === 'tasksLoaded') {
        const nextTasks = event.data.tasks.map(normalizeTask);
        const nextSelectedId = event.data.selectedId || selectedId || null;
        const validSelectedId = nextSelectedId && nextTasks.some((task) => task.id === nextSelectedId) ? nextSelectedId : null;
        const nextSelectedTask = nextTasks.find((task) => task.id === validSelectedId);

        setTasks(nextTasks);
        setSelectedId(validSelectedId);
        setDraft(nextSelectedTask ? taskToDraft(nextSelectedTask) : createEmptyDraft());
        flashStatus('저장되었습니다.');
        return;
      }

      if (event.data.action === 'tipsLoaded') {
        const nextTips = event.data.tips.map(normalizeTip);
        const nextSelectedId = event.data.selectedId || selectedTipId || null;
        const validSelectedId = nextSelectedId && nextTips.some((tip) => tip.id === nextSelectedId) ? nextSelectedId : null;
        const nextSelectedTip = nextTips.find((tip) => tip.id === validSelectedId);

        setTips(nextTips);
        setSelectedTipId(validSelectedId);
        setTipDraft(nextSelectedTip ? tipToDraft(nextSelectedTip) : createEmptyTipDraft());
        flashStatus('저장되었습니다.');
      }
    };

    window.addEventListener('message', listener);
    vscode?.postMessage({ action: 'loadTasks' });
    vscode?.postMessage({ action: 'loadTips' });

    return () => window.removeEventListener('message', listener);
  }, []);

  const createNewTask = () => {
    setActiveView('tasks');
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

  const focusTaskDescription = (id: string) => {
    selectTask(id);
    setFormFocusTarget('description');
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
    flashStatus('취소했습니다.');
  };

  const deleteTask = (id: string) => {
    vscode?.postMessage({ action: 'deleteTask', id });
  };

  const toggleCompleted = (id: string, completed: boolean) => {
    vscode?.postMessage({ action: 'toggleTaskCompleted', id, completed });
  };

  const createNewTip = () => {
    setActiveView('tips');
    setSelectedTipId(null);
    setTipDraft(createEmptyTipDraft());
  };

  const selectTip = (id: string) => {
    const tip = tips.find((current) => current.id === id);
    setSelectedTipId(id);
    setTipDraft(tip ? tipToDraft(tip) : createEmptyTipDraft());
  };

  const focusTipTitle = (id: string) => {
    selectTip(id);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLInputElement>('[data-tip-title-input="true"]');
      element?.focus();
    });
  };

  const focusLastVisibleTip = () => {
    const lastTipId = visibleTipIds[visibleTipIds.length - 1];
    if (!lastTipId) {
      return;
    }

    selectTip(lastTipId);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-tip-id="${lastTipId}"]`);
      element?.focus();
    });
  };

  const focusFirstVisibleTip = () => {
    const firstTipId = visibleTipIds[0];
    if (!firstTipId) {
      return;
    }

    selectTip(firstTipId);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-tip-id="${firstTipId}"]`);
      element?.focus();
    });
  };

  const saveTip = () => {
    if (!selectedTip) {
      vscode?.postMessage({ action: 'createTip', tip: tipDraft });
      return;
    }

    vscode?.postMessage({
      action: 'updateTip',
      tip: {
        ...selectedTip,
        ...tipDraft
      }
    });
  };

  const cancelTipEdit = () => {
    setTipDraft(selectedTip ? tipToDraft(selectedTip) : createEmptyTipDraft());
    flashStatus('취소했습니다.');
  };

  const deleteTip = (id: string) => {
    vscode?.postMessage({ action: 'deleteTip', id });
  };

  const flashStatus = (text: string) => {
    setStatus(text);
    window.setTimeout(() => setStatus(''), 1800);
  };

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const selector = activeView === 'tasks' ? '[data-task-search-input="true"]' : '[data-tip-search-input="true"]';
      const element = document.querySelector<HTMLInputElement>(selector);
      element?.focus();
    });
  }, [activeView]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === '1') {
        event.preventDefault();
        setActiveView('tasks');
        return;
      }

      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === '2') {
        event.preventDefault();
        setActiveView('tips');
        return;
      }

      if (activeView === 'tips' && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNewTip();
        return;
      }

      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNewTask();
        return;
      }

      if (activeView === 'tasks' && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'Home') {
        event.preventDefault();
        focusFirstVisibleTask();
        return;
      }

      if (activeView === 'tips' && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'Home') {
        event.preventDefault();
        focusFirstVisibleTip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, visibleTaskIds, tasks, tips]);

  return (
    <div className="app-shell">
      <nav className="view-tabs" aria-label="Task Manager views">
        <button className={activeView === 'tasks' ? 'active' : ''} type="button" onClick={() => setActiveView('tasks')}>Tasks</button>
        <button className={activeView === 'tips' ? 'active' : ''} type="button" onClick={() => setActiveView('tips')}>Tips</button>
      </nav>

      <div className="app">
        {activeView === 'tasks' ? (
          <>
            <TaskList
              tasks={tasks}
              selectedId={selectedId}
              onSelect={selectTask}
              onCreate={createNewTask}
              onDelete={deleteTask}
              onToggleCompleted={toggleCompleted}
              onFocusTaskDescription={focusTaskDescription}
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
          </>
        ) : (
          <>
            <TipList
              tips={tips}
              selectedId={selectedTipId}
              searchQuery={tipSearchQuery}
              onSearchQueryChange={setTipSearchQuery}
              onSelect={selectTip}
              onCreate={createNewTip}
              onDelete={deleteTip}
              onFocusTipTitle={focusTipTitle}
              onVisibleTipIdsChange={setVisibleTipIds}
            />
            <TipForm
              draft={tipDraft}
              selectedTip={selectedTip}
              onDraftChange={setTipDraft}
              onSave={saveTip}
              onCancel={cancelTipEdit}
              onDelete={deleteTip}
              onFocusLastTip={focusLastVisibleTip}
            />
          </>
        )}
      </div>
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

function normalizeTip(tip: WorkTip): WorkTip {
  return {
    ...tip,
    title: tip.title || '',
    tags: tip.tags || [],
    content: normalizeRichText(tip.content)
  };
}

function tipToDraft(tip: WorkTip): WorkTipDraft {
  return {
    title: tip.title || '',
    tags: tip.tags || [],
    content: normalizeRichText(tip.content)
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
