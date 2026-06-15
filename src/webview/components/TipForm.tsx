import type { Editor } from '@tiptap/react';
import { useEffect, useRef, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { WorkTip, WorkTipDraft } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { TagInput, type TagInputHandle } from './TagInput';

type TipFormProps = {
  draft: WorkTipDraft;
  selectedTip: WorkTip | undefined;
  onDraftChange(draft: WorkTipDraft): void;
  onSave(): void;
  onCancel(): void;
  onDelete(id: string): void;
  onFocusLastTip(): void;
};

export function TipForm({ draft, selectedTip, onDraftChange, onSave, onCancel, onDelete, onFocusLastTip }: TipFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<TagInputHandle>(null);
  const contentEditorRef = useRef<Editor | null>(null);

  const updateDraft = (changes: Partial<WorkTipDraft>) => {
    onDraftChange({ ...draft, ...changes });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  const focusContent = (): boolean => {
    const editor = contentEditorRef.current;
    if (!editor) {
      return false;
    }

    window.requestAnimationFrame(() => editor.commands.focus('end'));
    return true;
  };

  const focusTags = () => {
    window.requestAnimationFrame(() => tagInputRef.current?.focus());
  };

  const handleTagKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && !event.shiftKey && focusContent()) {
      event.preventDefault();
    }
  };

  const handleContentKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      focusTags();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <main className="main">
      <div className="toolbar form-toolbar">
        <h2>{selectedTip ? '팁 수정' : '새 팁 작성'}</h2>
      </div>

      <form ref={formRef} onSubmit={submit}>
        <div className="tip-form-grid">
          <label>
            제목
            <input
              data-tip-title-input="true"
              ref={titleInputRef}
              value={draft.title}
              required
              onChange={(event) => updateDraft({ title: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && event.shiftKey) {
                  event.preventDefault();
                  onFocusLastTip();
                }
              }}
            />
          </label>
          <TagInput
            ref={tagInputRef}
            tags={draft.tags}
            onChange={(tags) => updateDraft({ tags })}
            onInputKeyDown={handleTagKeyDown}
          />
        </div>

        <div className="rich-field-grid" onKeyDown={handleContentKeyDown}>
          <div className="rich-editor-panel">
            <div className="rich-editor-header">
              <div>
                <div className="field-label">팁 내용</div>
              </div>
            </div>
            <RichTextEditor
              key={`${selectedTip?.id || 'new'}-tip-content`}
              content={draft.content}
              onChange={(content) => updateDraft({ content })}
              onReady={(editor) => {
                contentEditorRef.current = editor;
              }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="primary" type="submit">저장</button>
          <button className="secondary" type="button" onClick={onCancel}>취소</button>
          <button className="danger" type="button" disabled={!selectedTip} onClick={() => selectedTip && onDelete(selectedTip.id)}>삭제</button>
        </div>
      </form>
    </main>
  );
}
