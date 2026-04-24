import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { loadMyAttendance, loadMySubjects, loadSectionStudents, saveBulkAttendance } from '../api';
import { AttendanceGrid } from '../components/AttendanceGrid';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, LoadingState } from '../components/States';
import type { AttendanceRecord, AttendanceStatus, MySubject, SectionStudent, User } from '../types';

export function AttendancePage({ user }: { user: User }) {
  const [subjects, setSubjects] = useState<MySubject[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AttendanceRecord[]>([]);
  const canMark = user.permissions.includes('attendance:manage');

  const sections = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    subjects.forEach((subject) => map.set(subject.sectionId, { id: subject.sectionId, name: subject.section }));
    return [...map.values()];
  }, [subjects]);

  useEffect(() => {
    Promise.all([loadMySubjects(), loadMyAttendance()]).then(([items, attendanceItems]) => {
      setSubjects(items);
      setSummary(attendanceItems);
      setSectionId(items[0]?.sectionId ?? '');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    loadSectionStudents(sectionId).then((items) => {
      setStudents(items);
      setValues(Object.fromEntries(items.map((student) => [student.id, 'presente'])));
    }).catch(() => setStudents([]));
  }, [sectionId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await saveBulkAttendance(date, students.map((student) => ({
      studentId: student.id,
      enrollmentId: student.enrollmentId,
      status: values[student.id] ?? 'presente'
    })));
  }

  if (loading) return <LoadingState label="Cargando espacio de asistencia..." />;

  if (!canMark) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Asistencia" title="Resumen de asistencia" description="Consulta registros de asistencia disponibles para tu rol." />
        <section className="panel">
          <DataTable
            rows={summary}
            columns={[
              { header: 'Estudiante', render: (row) => row.student },
              { header: 'Curso', render: (row) => row.section ?? row.course ?? '-' },
              { header: 'Fecha', render: (row) => row.date },
              { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> },
              { header: 'Observacion', render: (row) => row.note ?? '-' }
            ]}
          />
          {!summary.length && <EmptyState title="Sin registros de asistencia" />}
        </section>
      </div>
    );
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Asistencia"
        title={canMark ? 'Registrar asistencia de clase' : 'Resumen de asistencia'}
        description={canMark ? 'Selecciona un curso y una fecha para registrar la asistencia.' : 'Los registros visibles dependen de tu rol.'}
        actions={canMark && <button className="primary-button" type="submit"><Save size={17} /> Guardar asistencia</button>}
      />

      <section className="panel toolbar-panel">
        <label>
          Curso
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </section>

      <section className="panel">
        {students.length ? (
          <AttendanceGrid students={students} values={values} onChange={(studentId, status) => setValues((current) => ({ ...current, [studentId]: status }))} />
        ) : (
          <EmptyState title="Sin estudiantes" description="Este curso aun no tiene matriculas activas." />
        )}
      </section>
    </form>
  );
}
