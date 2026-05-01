import type { GradebookTableRow } from '../types';

function formatAverage(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

export function getGradebookStats(rows: GradebookTableRow[]) {
  let scored = 0;
  let pending = 0;
  let exempt = 0;

  rows.forEach((row) => {
    Object.values(row.scores).forEach((cell) => {
      if (cell.status === 'con_nota' && cell.score !== null) scored += 1;
      else if (cell.status === 'eximido') exempt += 1;
      else pending += 1;
    });
  });

  const averages = rows.map((row) => row.finalAverage).filter((value): value is number => value !== null);
  const courseAverage = averages.length ? Number((averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1)) : null;
  const atRisk = rows.filter((row) => row.academicRisk).length;

  return { courseAverage, scored, pending, atRisk, exempt };
}

export function GradebookStats({ rows }: { rows: GradebookTableRow[] }) {
  const stats = getGradebookStats(rows);

  return (
    <div className="gradebook-stats-bar">
      <article><span>Promedio curso</span><strong>{formatAverage(stats.courseAverage)}</strong></article>
      <article><span>Con nota</span><strong>{stats.scored}</strong></article>
      <article><span>Pendientes</span><strong>{stats.pending}</strong></article>
      <article><span>En riesgo</span><strong className={stats.atRisk ? 'danger' : ''}>{stats.atRisk}</strong></article>
      <article><span>Eximidos</span><strong>{stats.exempt}</strong></article>
    </div>
  );
}
