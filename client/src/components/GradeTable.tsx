import type { Grade } from '../types';
import { DataTable } from './DataTable';

export function GradeTable({ grades }: { grades: Grade[] }) {
  return (
    <DataTable
      rows={grades}
      columns={[
        { header: 'Estudiante', render: (row) => row.student },
        { header: 'Curso', render: (row) => row.section ?? row.course },
        { header: 'Asignatura', render: (row) => row.subject },
        { header: 'Evaluacion', render: (row) => row.assessment },
        { header: 'Nota', render: (row) => row.score.toFixed(1) }
      ]}
    />
  );
}
