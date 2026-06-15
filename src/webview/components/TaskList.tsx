import { useEffect, useMemo, useState } from 'react';
import type { Task } from '../types';
import { renderRichText, richTextToPlainText } from '../richText';

type TaskListProps = {
  tasks: Task[];
  selectedId: string | null;
  onSelect(id: string): void;
  onCreate(): void;
  onDelete(id: string): void;
  onToggleCompleted(id: string, completed: boolean): void;
  onFocusTaskDescription(id: string): void;
  onEditTaskContent(id: string): void;
  onVisibleTaskIdsChange(ids: string[]): void;
};

export function TaskList({
  tasks,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onToggleCompleted,
  onFocusTaskDescription,
  onEditTaskContent,
  onVisibleTaskIdsChange
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [tasks]
  );

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(task.category);
        const searchable = [
          task.category,
          task.description,
          task.schedule,
          `priority ${task.priority}`,
          ...(task.tags || []),
          richTextToPlainText(task.content)
        ].join(' ').toLowerCase();
        return matchesCategory && (!query || searchable.includes(query));
      })
      .sort((a, b) => b.priority - a.priority || a.description.localeCompare(b.description) || a.startDate.localeCompare(b.startDate));
  }, [searchQuery, selectedCategories, tasks]);

  useEffect(() => {
    onVisibleTaskIdsChange(visibleTasks.map((task) => task.id));
  }, [onVisibleTaskIdsChange, visibleTasks]);

  useEffect(() => {
    if (!isShortcutHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsShortcutHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutHelpOpen]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllVisible = () => {
    setExpandedIds(new Set(visibleTasks.map((task) => task.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const selectTask = (id: string) => {
    onSelect(id);
  };

  const focusTask = (id: string) => {
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
      element?.focus();
    });
  };

  const selectAdjacentVisibleTask = (currentIndex: number, direction: 'previous' | 'next'): boolean => {
    const nextIndex = direction === 'next'
      ? Math.min(currentIndex + 1, visibleTasks.length - 1)
      : Math.max(currentIndex - 1, 0);

    const nextTask = visibleTasks[nextIndex];
    if (!nextTask || nextIndex === currentIndex) {
      return false;
    }

    selectTask(nextTask.id);
    focusTask(nextTask.id);
    return true;
  };

  const setExpanded = (id: string, expanded: boolean) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="toolbar">
        <h1>Task Manager</h1>
        <div className="toolbar-actions">
          <button className="secondary" type="button" onClick={() => setIsShortcutHelpOpen(true)}>단축키</button>
          <button className="primary" type="button" onClick={onCreate}>새 Task</button>
        </div>
      </div>

      <div className="filters">
        <label>
          검색
          <input data-task-search-input="true" type="search" value={searchQuery} placeholder="category, tag, 내용 검색" onChange={(event) => setSearchQuery(event.target.value)} />
        </label>
        <div className="filter-block">
          <div className="filter-heading">
            <span>Category</span>
            <button className="text-button" type="button" disabled={selectedCategories.size === 0} onClick={() => setSelectedCategories(new Set())}>
              초기화
            </button>
          </div>
          <div className="category-buttons">
            {categories.length === 0 ? (
              <span className="filter-empty">Category 없음</span>
            ) : categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-button ${selectedCategories.has(category) ? 'active' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="list-controls">
          <button className="secondary" type="button" disabled={visibleTasks.length === 0} onClick={expandAllVisible}>전체 펼침</button>
          <button className="secondary" type="button" disabled={expandedIds.size === 0} onClick={collapseAll}>전체 접음</button>
        </div>
      </div>

      <div className="task-list">
        {visibleTasks.length === 0 ? (
          <div className="empty">{tasks.length === 0 ? '등록된 task가 없습니다.' : '조건에 맞는 task가 없습니다.'}</div>
        ) : visibleTasks.map((task, index) => (
          <div
            key={task.id}
            data-task-id={task.id}
            className={`task-item ${task.id === selectedId ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => selectTask(task.id)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) {
                return;
              }

              if (event.key === 'Enter' || (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'e')) {
                event.preventDefault();
                onEditTaskContent(task.id);
              }
              if (event.key === ' ') {
                event.preventDefault();
                selectTask(task.id);
              }
              if (event.key === 'Tab') {
                const moved = selectAdjacentVisibleTask(index, event.shiftKey ? 'previous' : 'next');
                if (moved) {
                  event.preventDefault();
                } else if (!event.shiftKey && index === visibleTasks.length - 1) {
                  event.preventDefault();
                  onFocusTaskDescription(task.id);
                }
              }
              if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowUp') {
                event.preventDefault();
                setExpanded(task.id, false);
              }
              if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowDown') {
                event.preventDefault();
                setExpanded(task.id, true);
              }
            }}
          >
            <input
              type="checkbox"
              checked={task.completed}
              title="완료 여부"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onToggleCompleted(task.id, event.target.checked)}
            />
            <button
              className="icon-button"
              type="button"
              title={expandedIds.has(task.id) ? '접기' : '펼치기'}
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(task.id);
              }}
            >
              {expandedIds.has(task.id) ? 'v' : '>'}
            </button>
            <div className="task-summary">
              <div className="task-title-row">
                <span className="category-prefix">{task.category || 'category 없음'}</span>
                <div className="task-title">{task.description || '(description 없음)'}</div>
                <span className="priority-badge">P{task.priority}</span>
              </div>
              <div className="task-meta">{[task.startDate, task.expectedEndDate].filter(Boolean).join(' ~ ')}</div>
              <div className="tag-list">
                {task.schedule !== 'none' ? <span className="schedule-chip">{scheduleLabel(task.schedule)}</span> : null}
                {(task.tags || []).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              title="삭제"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(task.id);
              }}
            >
              x
            </button>

            {expandedIds.has(task.id) && (
              <div className="task-details" onClick={(event) => event.stopPropagation()}>
                <DetailBlock label="Task 내용" content={task.content} />
              </div>
            )}
          </div>
        ))}
      </div>

      {isShortcutHelpOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsShortcutHelpOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-help-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="shortcut-help-title">단축키</h3>
              <button className="icon-button" type="button" aria-label="닫기" onClick={() => setIsShortcutHelpOpen(false)}>x</button>
            </div>
            <dl className="shortcut-list">
              <div><dt>Alt+Shift+N</dt><dd>새 task 작성</dd></div>
              <div><dt>Alt+Home</dt><dd>첫 번째 task 선택</dd></div>
              <div><dt>Alt+Up</dt><dd>task 접기</dd></div>
              <div><dt>Alt+Down</dt><dd>task 펼치기</dd></div>
              <div><dt>E 또는 Enter</dt><dd>task 수정 및 Task 내용으로 이동</dd></div>
              <div><dt>Tab</dt><dd>다음 task 선택, 마지막 task에서는 Category로 이동</dd></div>
              <div><dt>Shift+Tab</dt><dd>이전 task 선택 또는 task 수정에서 마지막 task로 이동</dd></div>
              <div><dt>Ctrl+S</dt><dd>현재 task 저장</dd></div>
              <div><dt>Esc</dt><dd>열린 도움말 닫기</dd></div>
            </dl>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function scheduleLabel(schedule: Task['schedule']): string {
  switch (schedule) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return '';
  }
}

function DetailBlock({ label, content }: { label: string; content: Task['content'] }) {
  return (
    <section className="detail-block">
      <div className="detail-label">{label}</div>
      <div className="detail-text rich-readonly">{renderRichText(content)}</div>
    </section>
  );
}
