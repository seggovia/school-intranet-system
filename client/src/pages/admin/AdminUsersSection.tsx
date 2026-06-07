import React from 'react';
import { Edit3, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';
import type { AdminUserRow, Role } from '../../types';

export default function AdminUsersSection({
  users,
  roleLabels,
  canManage,
  onEdit,
  onToggleStatus,
  onResetPassword
}: {
  users: AdminUserRow[];
  roleLabels: Record<Role, string>;
  canManage: boolean;
  onEdit: (row: AdminUserRow) => void;
  onToggleStatus: (row: AdminUserRow) => void;
  onResetPassword: (row: AdminUserRow) => void;
}) {
  if (!users.length) return (
    <div className="admin-empty"><strong>Sin usuarios</strong><span>No hay usuarios con esos filtros.</span></div>
  );

  return (
    <>
      <div className="admin-table-header"><span>Usuario</span><span>Rol</span><span>Estado</span><span>Acciones</span></div>
      <div className="admin-table-list">
        {users.map((row) => (
          <article key={row.id} className="admin-table-card">
            <div>
              <strong>{row.name}</strong>
              <small>{row.email}</small>
            </div>
            <span>{roleLabels[row.role]}</span>
            <span className={`admin-status ${row.isActive ? 'active' : 'inactive'}`}>{row.isActive ? 'Activo' : 'Inactivo'}</span>
            <div className="admin-row-actions">
              {canManage && (
                <>
                  <button onClick={() => onEdit(row)}><Edit3 size={16} />Editar</button>
                  <button onClick={() => onToggleStatus(row)}>{row.isActive ? <ToggleRight /> : <ToggleLeft />} {row.isActive ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => onResetPassword(row)}><KeyRound size={16} />Restablecer contraseña</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
