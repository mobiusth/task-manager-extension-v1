import { useEffect, useMemo, useState } from 'react';
import type { WorkTip } from '../types';
import { renderRichText, richTextToPlainText } from '../richText';

type TipListProps = {
  tips: WorkTip[];
  selectedId: string | null;
  searchQuery: string;
  onSearchQueryChange(query: string): void;
  onSelect(id: string): void;
  onCreate(): void;
  onDelete(id: string): void;
  onFocusTipTitle(id: string): void;
  onVisibleTipIdsChange(ids: string[]): void;
};

export function TipList({
  tips,
  selectedId,
  searchQuery,
  onSearchQueryChange,
  onSelect,
  onCreate,
  onDelete,
  onFocusTipTitle,
  onVisibleTipIdsChange
}: TipListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  const visibleTips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tips
      .filter((tip) => {
        const searchable = [
          tip.title,
          ...(tip.tags || []),
          richTextToPlainText(tip.content)
        ].join(' ').toLowerCase();
        return !query || searchable.includes(query);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
  }, [searchQuery, tips]);

  useEffect(() => {
    onVisibleTipIdsChange(visibleTips.map((tip) => tip.id));
  }, [onVisibleTipIdsChange, visibleTips]);

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

  const selectCollapsed = (id: string) => {
    setExpanded(id, false);
    onSelect(id);
  };

  const focusTip = (id: string) => {
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-tip-id="${id}"]`);
      element?.focus();
    });
  };

  const selectAdjacentVisibleTip = (currentIndex: number, direction: 'previous' | 'next'): boolean => {
    const nextIndex = direction === 'next'
      ? Math.min(currentIndex + 1, visibleTips.length - 1)
      : Math.max(currentIndex - 1, 0);

    const nextTip = visibleTips[nextIndex];
    if (!nextTip || nextIndex === currentIndex) {
      return false;
    }

    selectCollapsed(nextTip.id);
    focusTip(nextTip.id);
    return true;
  };

  return (
    <aside className="sidebar">
      <div className="toolbar">
        <h1>업무 팁</h1>
        <div className="toolbar-actions">
          <button className="secondary" type="button" onClick={() => setIsShortcutHelpOpen(true)}>단축키</button>
          <button className="primary" type="button" onClick={onCreate}>새 팁</button>
        </div>
      </div>

      <div className="filters">
        <label>
          검색
          <input
            data-tip-search-input="true"
            type="search"
            value={searchQuery}
            placeholder="제목, 태그, 내용 검색"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div className="tip-list">
        {visibleTips.length === 0 ? (
          <div className="empty">{tips.length === 0 ? '등록된 팁이 없습니다.' : '검색 조건에 맞는 팁이 없습니다.'}</div>
        ) : visibleTips.map((tip, index) => (
          <div
            key={tip.id}
            data-tip-id={tip.id}
            className={`tip-item ${tip.id === selectedId ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => selectCollapsed(tip.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectCollapsed(tip.id);
              }
              if (event.key === 'Tab') {
                if (event.shiftKey) {
                  if (selectAdjacentVisibleTip(index, 'previous')) {
                    event.preventDefault();
                  }
                } else if (index === visibleTips.length - 1) {
                  event.preventDefault();
                  onFocusTipTitle(tip.id);
                } else if (selectAdjacentVisibleTip(index, 'next')) {
                  event.preventDefault();
                }
              }
              if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowUp') {
                event.preventDefault();
                setExpanded(tip.id, false);
              }
              if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowDown') {
                event.preventDefault();
                setExpanded(tip.id, true);
              }
            }}
          >
            <button
              className="icon-button"
              type="button"
              title={expandedIds.has(tip.id) ? '접기' : '펼치기'}
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(tip.id);
              }}
            >
              {expandedIds.has(tip.id) ? 'v' : '>'}
            </button>
            <div className="tip-summary">
              <div className="tip-title">{tip.title || '(제목 없음)'}</div>
              <div className="task-meta">수정일 {formatDate(tip.updatedAt)}</div>
              <div className="tag-list">
                {(tip.tags || []).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              title="삭제"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(tip.id);
              }}
            >
              x
            </button>
            {expandedIds.has(tip.id) ? (
              <div className="tip-preview" onClick={(event) => event.stopPropagation()}>
                <div className="detail-text rich-readonly">{renderRichText(tip.content)}</div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {isShortcutHelpOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsShortcutHelpOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tip-shortcut-help-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="tip-shortcut-help-title">팁 단축키</h3>
              <button className="icon-button" type="button" aria-label="닫기" onClick={() => setIsShortcutHelpOpen(false)}>x</button>
            </div>
            <dl className="shortcut-list">
              <div><dt>Alt+1</dt><dd>Tasks 화면으로 전환</dd></div>
              <div><dt>Alt+2</dt><dd>Tips 화면으로 전환</dd></div>
              <div><dt>Alt+Shift+N</dt><dd>Tips 화면에서 새 팁 작성</dd></div>
              <div><dt>Ctrl+S</dt><dd>현재 팁 저장</dd></div>
              <div><dt>Alt+Up</dt><dd>포커스된 팁 접기</dd></div>
              <div><dt>Alt+Down</dt><dd>포커스된 팁 펼치기</dd></div>
              <div><dt>Tab</dt><dd>태그에서 팁 내용으로 이동</dd></div>
              <div><dt>Shift+Tab</dt><dd>팁 내용에서 태그로 이동</dd></div>
              <div><dt>Esc</dt><dd>팝업 닫기</dd></div>
            </dl>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function formatDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}
