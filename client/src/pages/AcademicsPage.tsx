import { useMemo, useState } from 'react';
import { BookOpen, ClipboardCheck, GraduationCap, Search, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadAssessments, loadAttendance, loadCourses, loadGrades, loadMyAttendance, loadMyGrades, loadMySubjects, loadStudents, loadSubjects } from '../api';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/States';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { SubjectCard } from '../components/SubjectCard';
import { useAsyncData } from '../hooks';
import type { Assessment, AttendanceRecord, Course, Grade, MySubject, Student, Subject, User } from '../types';

const emptyCourses = async () => [] as Course[];
const emptyStudents = async () => [] as Student[];
const emptySubjects = async () => [] as Subject[];
const emptyAssessments = async () => [] as Assessment[];
type AcademicTab = 'cursos' | 'estudiantes' | 'asignaturas' | 'evaluaciones' | 'calificaciones';

const tabs: Array<{ id: AcademicTab; label: string; icon: typeof BookOpen }> = [
  { id: 'cursos', label: 'Cursos', icon: GraduationCap },
  { id: 'estudiantes', label: 'Estudiantes', icon: Users },
  { id: 'asignaturas', label: 'Asignaturas', icon: BookOpen },
  { id: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
  { id: 'calificaciones', label: 'Calificaciones', icon: Star }
];

function includes(value: string | number | undefined, query: string) {
  return String(value ?? '').toLowerCase().includes(query);
}

export function AcademicsPage({ user }: { user: User }) {
  const [tab, setTab] = useState<AcademicTab>('cursos');
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const canSeeGlobalAcademics = ['admin', 'director', 'inspector'].includes(user.primaryRole);
  const canSeeAssessments = ['admin', 'director'].includes(user.primaryRole);
  const courses = useAsyncData(canSeeGlobalAcademics ? loadCourses : emptyCourses, [] as Course[]);
  const students = useAsyncData(canSeeGlobalAcademics ? loadStudents : emptyStudents, [] as Student[]);
  const subjects = useAsyncData(canSeeGlobalAcademics ? loadSubjects : emptySubjects, [] as Subject[]);
  const mySubjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const assessments = useAsyncData(canSeeAssessments ? loadAssessments : emptyAssessments, [] as Assessment[]);
  const grades = useAsyncData(canSeeGlobalAcademics ? loadGrades : loadMyGrades, [] as Grade[]);
  const attendance = useAsyncData(canSeeGlobalAcademics ? loadAttendance : loadMyAttendance, [] as AttendanceRecord[]);
  const normalizedQuery = query.trim().toLowerCase();
  const courseOptions = useMemo(() => Array.from(new Set([...courses.data.map((course) => course.name), ...students.data.map((student) => student.course), ...grades.data.map((grade) => grade.course ?? grade.section ?? '')].filter(Boolean))).sort(), [courses.data, grades.data, students.data]);
  const subjectOptions = useMemo(() => Array.from(new Set([...subjects.data.map((subject) => subject.name), ...assessments.data.map((assessment) => assessment.subject), ...grades.data.map((grade) => grade.subject)].filter(Boolean))).sort(), [assessments.data, grades.data, subjects.data]);
  const filteredCourses = courses.data.filter((course) => (!normalizedQuery || includes(course.name, normalizedQuery) || includes(course.teacher, normalizedQuery) || includes(course.room, normalizedQuery)) && (!courseFilter || course.name === courseFilter));
  const filteredStudents = students.data.filter((student) => (!normalizedQuery || includes(student.name, normalizedQuery) || includes(student.guardian, normalizedQuery) || includes(student.course, normalizedQuery)) && (!courseFilter || student.course === courseFilter));
  const filteredSubjects = subjects.data.filter((subject) => !normalizedQuery || includes(subject.name, normalizedQuery) || includes(subject.code, normalizedQuery) || subject.teachers.some((teacher) => includes(teacher, normalizedQuery)) || subject.sections.some((section) => includes(section, normalizedQuery)));
  const filteredAssessments = assessments.data.filter((assessment) => (!normalizedQuery || includes(assessment.title, normalizedQuery) || includes(assessment.subject, normalizedQuery)) && (!subjectFilter || assessment.subject === subjectFilter));
  const filteredGrades = grades.data.filter((grade) => (!normalizedQuery || includes(grade.student, normalizedQuery) || includes(grade.assessment, normalizedQuery) || includes(grade.subject, normalizedQuery)) && (!courseFilter || grade.course === courseFilter || grade.section === courseFilter) && (!subjectFilter || grade.subject === subjectFilter));
  const courseStudents = selectedCourse ? students.data.filter((student) => student.course === selectedCourse.name) : [];
  const courseSubjects = selectedCourse ? subjects.data.filter((subject) => subject.sections.includes(selectedCourse.name)) : [];
  const courseAssessments = selectedCourse ? assessments.data.filter((assessment) => courseSubjects.some((subject) => subject.name === assessment.subject)) : [];
  const courseAttendance = selectedCourse ? attendance.data.filter((record) => record.course === selectedCourse.name || record.section === selectedCourse.name) : [];

  return (
    <div className="page-stack academic-page">
      <PageHeader eyebrow="Académico" title="Gestión académica" description="Cursos, estudiantes, asignaturas, evaluaciones y calificaciones con filtros y navegación jerárquica." />

      <section className="academic-tabs" aria-label="Submodulos academicos">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon size={17} /> {item.label}</button>;
        })}
      </section>

      <section className="panel academic-filter-panel">
        <label className="admin-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, curso, docente, asignatura o evaluación" />
        </label>
        <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
          <option value="">Todos los cursos</option>
          {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
        </select>
        <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
          <option value="">Todas las asignaturas</option>
          {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </select>
      </section>

      {!canSeeGlobalAcademics && (
        <section className="subject-grid">
          {mySubjects.data.map((subject) => <SubjectCard key={`${subject.id}-${subject.sectionId}`} subject={subject} />)}
          {!mySubjects.data.length && <EmptyState title="Sin asignaturas asignadas" />}
        </section>
      )}

      {canSeeGlobalAcademics && tab === 'cursos' && (
        <section className="panel">
          <h2>Cursos</h2>
          <DataTable
            rows={filteredCourses}
            columns={[
              { header: 'Curso', render: (row) => <button className="table-link-button" type="button" onClick={() => setSelectedCourse(row)}>{row.name}</button> },
              { header: 'Profesor jefe', render: (row) => row.teacher },
              { header: 'Sala', render: (row) => row.room },
              { header: 'Estudiantes', render: (row) => row.students },
              { header: 'Asistencia', render: (row) => `${row.attendance}%` },
              { header: 'Promedio', render: (row) => row.average.toFixed(1) }
            ]}
          />
        </section>
      )}

      {canSeeGlobalAcademics && tab === 'estudiantes' && (
        <section className="panel">
          <h2>Estudiantes</h2>
          <DataTable rows={filteredStudents} columns={[
            { header: 'Estudiante', render: (row) => row.name },
            { header: 'Curso', render: (row) => row.course },
            { header: 'Apoderado', render: (row) => row.guardian },
            { header: 'Asistencia', render: (row) => `${row.attendance}%` },
            { header: 'Promedio', render: (row) => row.average.toFixed(1) },
            { header: 'Riesgo', render: (row) => <StatusBadge value={row.risk} /> }
          ]} />
        </section>
      )}

      {canSeeGlobalAcademics && tab === 'asignaturas' && (
        <section className="panel">
          <h2>Asignaturas</h2>
          <DataTable rows={filteredSubjects} columns={[
            { header: 'Código', render: (row) => row.code },
            { header: 'Asignatura', render: (row) => row.name },
            { header: 'Docentes', render: (row) => row.teachers.join(', ') || 'Sin docente' },
            { header: 'Cursos', render: (row) => row.sections.join(', ') || 'Sin cursos' }
          ]} />
        </section>
      )}

      {canSeeAssessments && tab === 'evaluaciones' && (
        <section className="panel">
          <h2>Evaluaciones</h2>
          <DataTable rows={filteredAssessments} columns={[
            { header: 'Evaluación', render: (row) => row.title },
            { header: 'Asignatura', render: (row) => row.subject },
            { header: 'Fecha', render: (row) => row.date },
            { header: 'Peso', render: (row) => row.weight },
            { header: 'Notas', render: (row) => row.grades }
          ]} />
        </section>
      )}

      {tab === 'calificaciones' && (
        <section className="panel">
          <h2>Calificaciones</h2>
          <DataTable rows={filteredGrades} columns={[
            { header: 'Estudiante', render: (row) => row.student },
            { header: 'Curso', render: (row) => row.course ?? row.section ?? '-' },
            { header: 'Asignatura', render: (row) => row.subject },
            { header: 'Evaluación', render: (row) => row.assessment },
            { header: 'Nota', render: (row) => row.score.toFixed(1) }
          ]} />
        </section>
      )}

      {selectedCourse && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCourse(null)}>
          <section className="course-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><span className="eyebrow">Curso</span><h2>{selectedCourse.name}</h2></div>
              <button className="secondary-button" type="button" onClick={() => setSelectedCourse(null)}>Cerrar</button>
            </header>
            <div className="course-detail-grid">
              <article><strong>{courseStudents.length}</strong><span>Estudiantes</span></article>
              <article><strong>{courseSubjects.length}</strong><span>Asignaturas</span></article>
              <article><strong>{courseAssessments.length}</strong><span>Evaluaciones</span></article>
              <article><strong>{courseAttendance.length}</strong><span>Registros de asistencia</span></article>
            </div>
            <div className="course-detail-columns">
              <section><h3>Estudiantes</h3>{courseStudents.slice(0, 8).map((student) => <span key={student.id}>{student.name}</span>)}</section>
              <section><h3>Asignaturas</h3>{courseSubjects.slice(0, 8).map((subject) => <span key={subject.id}>{subject.name}</span>)}</section>
              <section><h3>Evaluaciones</h3>{courseAssessments.slice(0, 8).map((assessment) => <span key={assessment.id}>{assessment.title}</span>)}</section>
              <section><h3>Asistencia</h3><Link className="primary-button" to="/asistencia">Abrir asistencia</Link></section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
