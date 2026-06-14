export function todayDateInputValue(): string {
  return formatDateInputValue(new Date());
}

export function normalizeDateInput(input: string, baseDateValue?: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const fullDateMatch = trimmed.match(/^(\d{2}|\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (fullDateMatch) {
    return normalizeFullDate(normalizeYear(Number(fullDateMatch[1])), Number(fullDateMatch[2]), Number(fullDateMatch[3]));
  }

  const monthDayMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!monthDayMatch) {
    return null;
  }

  const baseDate = parseDateInputValue(baseDateValue) || new Date();
  const month = Number(monthDayMatch[1]);
  const day = Number(monthDayMatch[2]);
  const candidate = createDate(baseDate.getFullYear(), month, day);
  return candidate ? formatDateInputValue(candidate) : null;
}

export function parseDateInputValue(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return createDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function normalizeFullDate(year: number, month: number, day: number): string | null {
  const date = createDate(year, month, day);
  return date ? formatDateInputValue(date) : null;
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function createDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
