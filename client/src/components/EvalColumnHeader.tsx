import { useState } from 'react';
import { Edit3, MoreVertical, Trash2 } from 'lucide-react';
import type { GradebookEvaluation } from '../types';

export function EvalColumnHeader({
  evaluation,
  onEdit,
  onDelete
}: {
  evaluation: GradebookEvaluation;
  onEdit?: (evaluation: GradebookEvaluation) => void;
  onDelete?: (evaluation: GradebookEvaluation) => void;
}) {
  const [open, setOpen] = useState(false);
  const canManage = Boolean(onEdit || onDelete);

  return (
    <div className="eval-column-header">
      <div>
        <strong>{evaluation.title}</strong>
        <small>{evaluation.date}</small>
        <span className="evaluation-weight-badge">{evaluation.weight}%</span>
      </div>
      {canManage && (
        <div className="gradebook-evaluation-menu">
          <button type="button" className="icon-button" aria-label={`Acciones de ${evaluation.title}`} onClick={() => setOpen((current) => !current)}>
            <MoreVertical size={16} />
          </button>
          {open && (
            <div className="context-menu">
              {onEdit && <button type="button" onClick={() => { setOpen(false); onEdit(evaluation); }}><Edit3 size={14} />Editar evaluación</button>}
              {onDelete && <button type="button" className="danger-menu-item" onClick={() => { setOpen(false); onDelete(evaluation); }}><Trash2 size={14} />Eliminar evaluación</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
