import React from 'react';
import { Edit3, ClipboardList } from 'lucide-react';
import type { AdminStudentRow } from '../../types';

export default function AdminStudentsSection({
  students,
  canManage,
  onOpenObservations,
  onEdit,
  onToggleStatus
}: {
  students: AdminStudentRow[];
  canManage: boolean;
  onOpenObservations: (row: AdminStudentRow) => void;
  onEdit: (row: AdminStudentRow) => void;
  onToggleStatus: (row: AdminStudentRow) => void;
}) {
  if (!students.length) return (
    <div className="admin-empty"><strong>Sin estudiantes</strong><span>No hay estudiantes con esos filtros.</span></div>
  );

  return (
    <>
      <div className="admin-table-header"><span>Estudiante</span><span>Curso / Sección</span><span>Apoderado</span><span>Estado</span><span>Acciones</span></div>
      <div className="admin-table-list">
        {students.map((row) => (
          <article key={row.id} className="admin-table-card">
            <div>
              <strong>{row.name}</strong>
              <small>{row.email}</small>
            </div>
            <span>{row.course} · {row.section}</span>
            <span>{row.guardians.length ? row.guardians.map((g) => g.name).join(', ') : 'Sin apoderado'}</span>
            <span className={`admin-status ${row.isActive ? 'active' : 'inactive'}`}>{row.isActive ? 'Activo' : 'Inactivo'}</span>
            <div className="admin-row-actions">
              {canManage && (
                <>
                  <button onClick={() => onOpenObservations(row)}><ClipboardList size={16} />Anotaciones</button>
                  <button onClick={() => onEdit(row)}><Edit3 size={16} />Editar</button>
                  <button onClick={() => onToggleStatus(row)}>{row.isActive ? 'Desactivar' : 'Activar'}</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
