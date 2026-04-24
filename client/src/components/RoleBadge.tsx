import type { Role } from '../types';

const labels: Record<Role, string> = {
  admin: 'Administrador',
  director: 'Director',
  teacher: 'Docente',
  student: 'Estudiante',
  guardian: 'Apoderado',
  inspector: 'Inspector'
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role-badge role-${role}`}>{labels[role]}</span>;
}
