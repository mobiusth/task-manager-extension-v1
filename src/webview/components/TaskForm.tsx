import { useEffect, useRef, type FormEvent } from 'react';
import type { RichField, Task, TaskDraft } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { emptyRichText } from '../richText';
import { TagInput } from './TagInput';

type TaskFormProps = {
  draft: TaskDraft;
  isOpen: boolean;
  selectedTask: Task | undefined;
  onDraftChange(draft: TaskDraft): void;
  onToggleOpen(): void;
  onSave(): void;
  onCancel(): void;
  onDelete(id: string): void;
};

const richFields: Array<{ key: RichField; label: string; guide: string }> = [
  { key: 'overview', label: '개요', guide: 'Task 시작 이유, 목적을 서술해주세요.' },
  { key: 'progress', label: '진행상황', guide: '세부적인 subtask를 서술해주세요. 예) 6/8, 기능 A 구현 완료' },
  { key: 'links', label: '관련 링크', guide: '관련이 있는 confluence link 등을 작성해주세요.' },
  { key: 'mails', label: '관련 메일', guide: '추적이 필요한 메일 스레드를 기록하세요. 예) 6/8, [xxx] 기능 구현 관련 건 메일' }
];

export function TaskForm({ draft, isOpen, selectedTask, onDraftChange, onToggleOpen, onSave, onCancel, onDelete }: TaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const updateDraft = (changes: Partial<TaskDraft>) => {
    onDraftChange({ ...draft, ...changes });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
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

  return (
    <main className={`main ${isOpen ? '' : 'collapsed'}`}>
      <div className="toolbar form-toolbar">
        <h2>{selectedTask ? 'Task 수정' : '새 Task 작성'}</h2>
        <button className="secondary" type="button" onClick={onToggleOpen}>
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
            Category
            <input value={draft.category} required onChange={(event) => updateDraft({ category: event.target.value })} />
          </label>
          <label>
            시작 시간
            <input type="date" value={draft.startDate} onChange={(event) => updateDraft({ startDate: event.target.value })} />
          </label>
          <label>
            예상 완료 시간
            <input type="date" value={draft.expectedEndDate} onChange={(event) => updateDraft({ expectedEndDate: event.target.value })} />
          </label>
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
          {richFields.map((field) => (
            <RichTextEditor
              key={`${selectedTask?.id || 'new'}-${field.key}`}
              label={field.label}
              guide={field.guide}
              content={draft[field.key] || emptyRichText}
              onChange={(content) => updateDraft({ [field.key]: content } as Partial<TaskDraft>)}
            />
          ))}
        </div>

        <div className="form-actions">
          <button className="primary" type="submit">저장</button>
          <button className="secondary" type="button" onClick={onCancel}>취소</button>
          <button className="danger" type="button" disabled={!selectedTask} onClick={() => selectedTask && onDelete(selectedTask.id)}>삭제</button>
        </div>
      </form>
      ) : null}
    </main>
  );
}
