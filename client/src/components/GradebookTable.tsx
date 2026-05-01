import { useState } from 'react';
import { Edit3, MoreVertical, Trash2 } from 'lucide-react';
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

export function GradebookTable({
  evaluations,
  rows,
  onEditEvaluation,
  onDeleteEvaluation
}: {
  evaluations: GradebookEvaluation[];
  rows: GradebookTableRow[];
  onEditEvaluation?: (evaluation: GradebookEvaluation) => void;
  onDeleteEvaluation?: (evaluation: GradebookEvaluation) => void;
}) {
  const [openMenu, setOpenMenu] = useState('');
  const canManage = Boolean(onEditEvaluation || onDeleteEvaluation);
  const columns: Column<GradebookTableRow>[] = [
    {
      id: 'student',
      header: 'Estudiante',
      render: (row) => (
        <div className="gradebook-student-cell">
          <strong>{row.student}</strong>
          {row.email && <small>{row.email}</small>}
        </div>
      )
    },
    ...evaluations.map((evaluation) => ({
      id: evaluation.id,
      header: (
        <div className="gradebook-evaluation-header">
          <div>
            <strong>{evaluation.title}</strong>
            <small>{evaluation.weight}% · {evaluation.date}</small>
          </div>
          {canManage && (
            <div className="gradebook-evaluation-menu">
              <button type="button" className="icon-button" aria-label={`Acciones de ${evaluation.title}`} onClick={() => setOpenMenu((current) => current === evaluation.id ? '' : evaluation.id)}>
                <MoreVertical size={16} />
              </button>
              {openMenu === evaluation.id && (
                <div className="context-menu">
                  {onEditEvaluation && <button type="button" onClick={() => { setOpenMenu(''); onEditEvaluation(evaluation); }}><Edit3 size={14} />Editar</button>}
                  {onDeleteEvaluation && <button type="button" className="danger-menu-item" onClick={() => { setOpenMenu(''); onDeleteEvaluation(evaluation); }}><Trash2 size={14} />Eliminar</button>}
                </div>
              )}
            </div>
          )}
        </div>
      ),
      render: (row: GradebookTableRow) => renderCell(row.scores[evaluation.id])
    })),
    {
      id: 'finalAverage',
      header: 'Promedio final',
      render: (row) => <strong className="gradebook-final-average">{formatScore(row.finalAverage)}</strong>
    }
  ];

  return <DataTable rows={rows} columns={columns} pageSize={12} emptyLabel="No hay estudiantes registrados para este curso" />;
}
