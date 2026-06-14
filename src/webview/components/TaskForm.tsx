import type { Editor } from '@tiptap/react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import type { Task, TaskDraft } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { TagInput } from './TagInput';
import { DateInput } from './DateInput';

type TaskFormProps = {
  draft: TaskDraft;
  isOpen: boolean;
  selectedTask: Task | undefined;
  onDraftChange(draft: TaskDraft): void;
  onToggleOpen(): void;
  onSave(): void;
  onCancel(): void;
  onDelete(id: string): void;
  focusTarget: 'category' | 'content' | null;
  onFocusHandled(): void;
  onFocusLastTask(): void;
};

export type TaskFormHandle = {
  focusCategory(): void;
  focusContent(): void;
};

export const TaskForm = forwardRef<TaskFormHandle, TaskFormProps>(function TaskForm(
  { draft, isOpen, selectedTask, onDraftChange, onToggleOpen, onSave, onCancel, onDelete, focusTarget, onFocusHandled, onFocusLastTask },
  ref
) {
  const formRef = useRef<HTMLFormElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const contentEditorRef = useRef<Editor | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const updateDraft = (changes: Partial<TaskDraft>) => {
    onDraftChange({ ...draft, ...changes });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  const focusCategory = () => {
    window.requestAnimationFrame(() => categoryInputRef.current?.focus());
  };

  const focusContent = (): boolean => {
    const editor = contentEditorRef.current;
    if (!editor) {
      return false;
    }

    window.requestAnimationFrame(() => editor.commands.focus('end'));
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave]);

  useImperativeHandle(ref, () => ({
    focusCategory() {
      focusCategory();
    },
    focusContent() {
      focusContent();
    }
  }), []);

  useEffect(() => {
    if (!isOpen || !focusTarget) {
      return;
    }

    if (focusTarget === 'category') {
      focusCategory();
      onFocusHandled();
      return;
    }

    if (focusContent()) {
      onFocusHandled();
    }
  }, [focusTarget, isOpen, onFocusHandled]);

  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  return (
    <main className={`main ${isOpen ? '' : 'collapsed'}`}>
      <div className="toolbar form-toolbar">
        <h2>{selectedTask ? 'Task 수정' : '새 Task 작성'}</h2>
        <button
          className="secondary"
          type="button"
          onClick={onToggleOpen}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && event.shiftKey) {
              event.preventDefault();
              onFocusLastTask();
            }
          }}
        >
          {isOpen ? '접기' : '열기'}
        </button>
      </div>

      {!isOpen ? (
        <div className="collapsed-form-message">
          {selectedTask ? '선택한 task를 수정하려면 열기를 누르세요.' : '새 task를 작성하려면 열기를 누르세요.'}
        </div>
      ) : null}

      {isOpen ? (
      <form ref={formRef} onSubmit={submit}>
        <div className="form-grid">
          <label>
            Task Description
            <input value={draft.description} required onChange={(event) => updateDraft({ description: event.target.value })} />
          </label>
          <label>
            Category
            <input ref={categoryInputRef} value={draft.category} required onChange={(event) => updateDraft({ category: event.target.value })} />
          </label>
          <DateInput label="시작 시간" value={draft.startDate} onChange={(startDate) => updateDraft({ startDate })} />
          <DateInput
            label="예상 완료 시간"
            value={draft.expectedEndDate}
            baseDate={draft.startDate}
            onChange={(expectedEndDate) => updateDraft({ expectedEndDate })}
          />
          <label>
            우선순위
            <select value={draft.priority} onChange={(event) => updateDraft({ priority: Number(event.target.value) as TaskDraft['priority'] })}>
              <option value={5}>5 - 가장 높음</option>
              <option value={4}>4 - 높음</option>
              <option value={3}>3 - 보통</option>
              <option value={2}>2 - 낮음</option>
              <option value={1}>1 - 가장 낮음</option>
            </select>
          </label>
          <label>
            반복 설정
            <select value={draft.schedule} onChange={(event) => updateDraft({ schedule: event.target.value as TaskDraft['schedule'] })}>
              <option value="none">반복 없음</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <TagInput tags={draft.tags} onChange={(tags) => updateDraft({ tags })} />
        </div>

        <div className="rich-field-grid">
          <div className="rich-editor-panel">
            <div className="rich-editor-header">
              <div>
                <div className="field-label">Task 내용</div>
                <p className="field-guide">개요, 진행상황, 관련 링크, 관련 메일을 작성하세요.</p>
              </div>
              <button
                className="secondary"
                type="button"
                onClick={() => setIsHelpOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab' && !event.shiftKey && focusContent()) {
                    event.preventDefault();
                  }
                }}
              >
                How to Write
              </button>
            </div>
            <RichTextEditor
              key={`${selectedTask?.id || 'new'}-content`}
              content={draft.content}
              onChange={(content) => updateDraft({ content })}
              onReady={(editor) => {
                contentEditorRef.current = editor;
                if (editor && focusTarget === 'content' && isOpen) {
                  window.requestAnimationFrame(() => editor.commands.focus('end'));
                  onFocusHandled();
                }
              }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="primary" type="submit">저장</button>
          <button className="secondary" type="button" onClick={onCancel}>취소</button>
          <button className="danger" type="button" disabled={!selectedTask} onClick={() => selectedTask && onDelete(selectedTask.id)}>삭제</button>
        </div>
      </form>
      ) : null}

      {isHelpOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsHelpOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-content-help-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="task-content-help-title">Task 내용 작성 예시</h3>
              <button className="icon-button" type="button" aria-label="닫기" onClick={() => setIsHelpOpen(false)}>x</button>
            </div>
            <ul className="help-list">
              <li>
                <strong>개요</strong>
                <ul>
                  <li>고객 요청으로 UEM v2.0 배포 안정성을 개선한다.</li>
                </ul>
              </li>
              <li>
                <strong>진행상황</strong>
                <ul>
                  <li>6/8, 기능 A 구현 완료.</li>
                  <li>6/9, QA 시나리오 작성 중.</li>
                </ul>
              </li>
              <li>
                <strong>관련 링크</strong>
                <ul>
                  <li>https://confluence.example.com/uem-v2</li>
                </ul>
              </li>
              <li>
                <strong>관련 메일</strong>
                <ul>
                  <li>6/8, [UEM] v2.0 배포 일정 확인 메일</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </main>
  );
});
