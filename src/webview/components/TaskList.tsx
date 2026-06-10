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
};

export function TaskList({ tasks, selectedId, onSelect, onCreate, onDelete, onToggleCompleted }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
          task.schedule,
          `priority ${task.priority}`,
          ...(task.tags || []),
          richTextToPlainText(task.overview),
          richTextToPlainText(task.progress),
          richTextToPlainText(task.links),
          richTextToPlainText(task.mails)
        ].join(' ').toLowerCase();
        return matchesCategory && (!query || searchable.includes(query));
      })
      .sort((a, b) => b.priority - a.priority || a.category.localeCompare(b.category) || a.startDate.localeCompare(b.startDate));
  }, [searchQuery, selectedCategories, tasks]);

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

  const selectAndExpand = (id: string) => {
    onSelect(id);
    setExpandedIds((current) => new Set(current).add(id));
  };

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    setExpandedIds((current) => {
      if (current.has(selectedId)) {
        return current;
      }
      return new Set(current).add(selectedId);
    });
  }, [selectedId]);

  return (
    <aside className="sidebar">
      <div className="toolbar">
        <h1>Task Manager</h1>
        <button className="primary" type="button" onClick={onCreate}>새 Task</button>
      </div>

      <div className="filters">
        <label>
          검색
          <input type="search" value={searchQuery} placeholder="category, tag, 내용 검색" onChange={(event) => setSearchQuery(event.target.value)} />
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
        ) : visibleTasks.map((task) => (
          <div
            key={task.id}
            className={`task-item ${task.id === selectedId ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => selectAndExpand(task.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectAndExpand(task.id);
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
                <div className="task-title">{task.category || '(category 없음)'}</div>
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
                <DetailBlock label="개요" content={task.overview} />
                <DetailBlock label="진행상황" content={task.progress} />
                <DetailBlock label="관련 링크" content={task.links} />
                <DetailBlock label="관련 메일" content={task.mails} />
              </div>
            )}
          </div>
        ))}
      </div>
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

function DetailBlock({ label, content }: { label: string; content: Task['overview'] }) {
  return (
    <section className="detail-block">
      <div className="detail-label">{label}</div>
      <div className="detail-text rich-readonly">{renderRichText(content)}</div>
    </section>
  );
}
