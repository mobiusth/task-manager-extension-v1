import { useState, type KeyboardEvent } from 'react';

type TagInputProps = {
  tags: string[];
  onChange(tags: string[]): void;
};

export function TagInput({ tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTags = (value: string) => {
    const nextTags = value
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (nextTags.length === 0) {
      return;
    }

    onChange(Array.from(new Set([...tags, ...nextTags])));
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((current) => current !== tag));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTags(draft);
      return;
    }

    if (event.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <label className="tag-input-label">
      Tags
      <div className="tag-input">
        {tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
            <button type="button" title={`${tag} 삭제`} onClick={() => removeTag(tag)}>
              x
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={tags.length === 0 ? '입력 후 Enter' : ''}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTags(draft)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (text.includes(',') || text.includes('\n')) {
              event.preventDefault();
              addTags(text);
            }
          }}
        />
      </div>
    </label>
  );
}
