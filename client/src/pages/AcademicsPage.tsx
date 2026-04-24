import { loadAssessments, loadAttendance, loadCourses, loadGrades, loadMyAttendance, loadMyGrades, loadMySubjects, loadStudents, loadSubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { SubjectCard } from '../components/SubjectCard';
import { useAsyncData } from '../hooks';
import type { Assessment, AttendanceRecord, Course, Grade, MySubject, Student, Subject, User } from '../types';

export function AcademicsPage({ user }: { user: User }) {
  const canSeeGlobalAcademics = ['admin', 'director', 'inspector'].includes(user.primaryRole);
  const canSeeAssessments = ['admin', 'director'].includes(user.primaryRole);
  const courses = useAsyncData(loadCourses, [] as Course[]);
  const students = useAsyncData(loadStudents, [] as Student[]);
  const subjects = useAsyncData(loadSubjects, [] as Subject[]);
  const mySubjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const assessments = useAsyncData(canSeeAssessments ? loadAssessments : async () => [] as Assessment[], [] as Assessment[]);
  const grades = useAsyncData(canSeeGlobalAcademics ? loadGrades : loadMyGrades, [] as Grade[]);
  const attendance = useAsyncData(canSeeGlobalAcademics ? loadAttendance : loadMyAttendance, [] as AttendanceRecord[]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Academico" title="Cursos, asignaturas y estudiantes" description="Espacio academico segun rol para cursos, asignaturas, evaluaciones y avance estudiantil." />

      <section className="subject-grid">
        {mySubjects.data.map((subject) => <SubjectCard key={`${subject.id}-${subject.sectionId}`} subject={subject} />)}
      </section>

      {canSeeGlobalAcademics && <section className="panel">
        <h2>Cursos activos</h2>
        <DataTable
          rows={courses.data}
          columns={[
            { header: 'Curso', render: (row) => row.name },
            { header: 'Profesor jefe', render: (row) => row.teacher },
            { header: 'Sala', render: (row) => row.room },
            { header: 'Estudiantes', render: (row) => row.students },
            { header: 'Asistencia', render: (row) => `${row.attendance}%` },
            { header: 'Promedio', render: (row) => row.average.toFixed(1) }
          ]}
        />
      </section>}

      {canSeeGlobalAcademics && <section className="panel">
        <h2>Alertas estudiantiles</h2>
        <DataTable
          rows={students.data}
          columns={[
            { header: 'Estudiante', render: (row) => row.name },
            { header: 'Curso', render: (row) => row.course },
            { header: 'Apoderado', render: (row) => row.guardian },
            { header: 'Asistencia', render: (row) => `${row.attendance}%` },
            { header: 'Promedio', render: (row) => row.average.toFixed(1) },
            { header: 'Riesgo', render: (row) => <StatusBadge value={row.risk} /> }
          ]}
        />
      </section>}

      {canSeeGlobalAcademics && <section className="panel">
        <h2>Asignaturas</h2>
        <DataTable
          rows={subjects.data}
          columns={[
            { header: 'Codigo', render: (row) => row.code },
            { header: 'Asignatura', render: (row) => row.name },
            { header: 'Docentes', render: (row) => row.teachers.join(', ') || 'Sin docente' },
            { header: 'Cursos', render: (row) => row.sections.join(', ') || 'Sin cursos' }
          ]}
        />
      </section>}

      {canSeeAssessments && <section className="panel">
        <h2>Evaluaciones</h2>
        <DataTable
          rows={assessments.data}
          columns={[
            { header: 'Evaluacion', render: (row) => row.title },
            { header: 'Asignatura', render: (row) => row.subject },
            { header: 'Fecha', render: (row) => row.date },
            { header: 'Peso', render: (row) => row.weight },
            { header: 'Notas', render: (row) => row.grades }
          ]}
        />
      </section>}

      <section className="panel">
        <h2>Ultimas calificaciones</h2>
        <DataTable
          rows={grades.data}
          columns={[
            { header: 'Estudiante', render: (row) => row.student },
            { header: 'Curso', render: (row) => row.course ?? row.section ?? '-' },
            { header: 'Asignatura', render: (row) => row.subject },
            { header: 'Evaluacion', render: (row) => row.assessment },
            { header: 'Nota', render: (row) => row.score.toFixed(1) }
          ]}
        />
      </section>

      <section className="panel">
        <h2>Asistencia reciente</h2>
        <DataTable
          rows={attendance.data}
          columns={[
            { header: 'Estudiante', render: (row) => row.student },
            { header: 'Curso', render: (row) => row.course },
            { header: 'Fecha', render: (row) => row.date },
            { header: 'Estado', render: (row) => <StatusBadge value={row.status} /> },
            { header: 'Nota', render: (row) => row.note ?? '-' }
          ]}
        />
      </section>
    </div>
  );
}
