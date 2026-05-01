import { KeyboardEvent } from 'react';

export function gradeTone(value: number | null) {
  if (value === null) return 'pending';
  if (value >= 5) return 'high';
  if (value >= 4) return 'mid';
  return 'low';
}

export function formatGrade(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

export function GradeCell({
  value,
  draft,
  error,
  hasUnsavedChange,
  rowIndex,
  colIndex,
  onChange,
  onNavigate
}: {
  value: number | null;
  draft?: string;
  error?: string;
  hasUnsavedChange: boolean;
  rowIndex: number;
  colIndex: number;
  onChange: (value: string) => void;
  onNavigate: (rowIndex: number, colIndex: number) => void;
}) {
  const displayValue = draft ?? (value === null ? '' : value.toFixed(1));
  const numericValue = displayValue === '' ? null : Number(displayValue);
  const tone = Number.isFinite(numericValue) ? gradeTone(numericValue) : 'pending';

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      onNavigate(rowIndex + 1, colIndex);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onNavigate(rowIndex - 1, colIndex);
    }
  }

  return (
    <label className={`spreadsheet-grade-cell ${hasUnsavedChange ? 'dirty' : ''} ${error ? 'invalid' : ''}`}>
      <input
        data-grade-cell={`${rowIndex}:${colIndex}`}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="—"
        className={`grade-tone-${tone}`}
        aria-invalid={Boolean(error)}
      />
      {hasUnsavedChange && <span className="unsaved-dot" aria-label="Cambio no guardado" />}
      {error && <small>{error}</small>}
    </label>
  );
}
