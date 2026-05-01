import { DataTable, type Column } from './DataTable';
import type { GradebookEvaluation, GradebookTableCell, GradebookTableRow } from '../types';

const statusText: Record<GradebookTableCell['status'], string> = {
  con_nota: 'Con nota',
  pendiente: 'Pendiente',
  ausente: 'Ausente',
  eximido: 'Eximido'
};

function formatScore(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

function renderCell(cell?: GradebookTableCell) {
  if (!cell) return <span className="gradebook-score muted">-</span>;
  if (cell.status === 'con_nota') return <span className="gradebook-score">{formatScore(cell.score)}</span>;
  return <span className={`grade-status ${cell.status}`}>{statusText[cell.status]}</span>;
}

export function GradebookTable({ evaluations, rows }: { evaluations: GradebookEvaluation[]; rows: GradebookTableRow[] }) {
  const columns: Column<GradebookTableRow>[] = [
    {
      header: 'Estudiante',
      render: (row) => (
        <div className="gradebook-student-cell">
          <strong>{row.student}</strong>
          {row.email && <small>{row.email}</small>}
        </div>
      )
    },
    ...evaluations.map((evaluation) => ({
      header: `${evaluation.title} (${evaluation.date})`,
      render: (row: GradebookTableRow) => renderCell(row.scores[evaluation.id])
    })),
    {
      header: 'Promedio final',
      render: (row) => <strong className="gradebook-final-average">{formatScore(row.finalAverage)}</strong>
    }
  ];

  return <DataTable rows={rows} columns={columns} pageSize={12} emptyLabel="No hay estudiantes registrados para este curso" />;
}
