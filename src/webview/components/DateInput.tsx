import { useEffect, useState } from 'react';
import { normalizeDateInput, todayDateInputValue } from '../dateUtils';

type DateInputProps = {
  label: string;
  value: string;
  baseDate?: string;
  onChange(value: string): void;
};

export function DateInput({ label, value, baseDate, onChange }: DateInputProps) {
  const [text, setText] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setText(value);
    setError('');
  }, [value]);

  const commit = () => {
    const normalized = normalizeDateInput(text, baseDate || todayDateInputValue());
    if (normalized === null) {
      setText(value);
      setError('6/14, 6-14, 26/05/14, 2026-06-14 형식으로 입력하세요.');
      return;
    }

    setError('');
    setText(normalized);
    onChange(normalized);
  };

  return (
    <label>
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder="YYYY-MM-DD, 26/05/14 또는 6/14"
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
