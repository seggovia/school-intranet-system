import { Activity, AlertTriangle, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileText, GraduationCap, HelpCircle, TrendingUp, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { loadAttendanceMe, loadGradebookMe, loadMyDashboard, loadMySchedule, loadMySubjects } from '../api';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';
import { InstitutionalScheduleSummary, PersonalScheduleCards } from '../components/ScheduleCalendar';
import { SectionCard } from '../components/SectionCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { StatCard } from '../components/StatCard';
import { useAsyncData } from '../hooks';
import type { AttendanceHistoryItem, GradebookHistoryItem, MyAttendanceResponse, MyGradebookResponse, MySubject, RoleDashboard, ScheduleCalendarEvent } from '../types';

const emptyDashboard: RoleDashboard = { role: 'student', profile: { id: '', name: '', email: '', roles: [] }, stats: [], sections: [], linkedStudents: [], announcements: [], documents: [] };
const icons = [Users, ClipboardCheck, GraduationCap, HelpCircle, TrendingUp, AlertTriangle];
type DashboardObservation = { id: string; studentId: string; student?: string; author: string; section: string | null; body: string; type: 'positiva' | 'negativa' | 'neutral'; date: string; isVisible: boolean; createdAt: string };

function dashboardCopy(role: string) {
  if (role === 'teacher') return ['Panel docente', 'Cursos, asistencia, evaluaciones y comunicaciones en una vista operativa.'];
  if (role === 'student') return ['Portal del estudiante', 'Horario, asignaturas, asistencia, calificaciones y comunicaciones relevantes.'];
  if (role === 'guardian') return ['Portal del apoderado', 'Seguimiento académico, asistencia, comunicados y solicitudes de estudiantes vinculados.'];
  if (role === 'inspector') return ['Gestión de asistencia', 'Seguimiento institucional de asistencia, alertas y registros diarios.'];
  return ['Panel institucional', 'Indicadores, operación académica, comunicaciones y acciones rápidas del establecimiento.'];
}

function barValue(index: number) {
  return [82, 88, 91, 86, 93, 89][index] ?? 80;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function scoreLabel(score: number | null) {
  return score === null ? '-' : score.toFixed(1);
}

function attendanceLabel(status: AttendanceHistoryItem['status']) {
  return status === 'atrasado' ? 'tarde' : status;
}

function nextClass(events: ScheduleCalendarEvent[]) {
  const now = Date.now();
  return [...events].filter((event) => new Date(event.start).getTime() >= now).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;
}

function StudentPortal({ dashboard, schedule }: { dashboard: RoleDashboard; schedule: ScheduleCalendarEvent[] }) {
  const subjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const grades = useAsyncData(loadGradebookMe, null as MyGradebookResponse | null);
  const attendance = useAsyncData(loadAttendanceMe, null as MyAttendanceResponse | null);
  const upcomingClass = nextClass(schedule);
  const upcomingAssessments = subjects.data
    .flatMap((subject) => subject.assessments.map((assessment) => ({ ...assessment, subject: subject.name, section: subject.section })))
    .filter((assessment) => assessment.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const recentGrades = (grades.data?.history ?? []).slice(0, 5);
  const recentAttendance = (attendance.data?.history ?? []).slice(0, 5);
  const recentMaterials = subjects.data
    .flatMap((subject) => subject.materials.map((material) => ({ ...material, subject: subject.name })))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const observations = ((dashboard as RoleDashboard & { observations?: DashboardObservation[] }).observations ?? []).slice(0, 5);
  const alerts = [
    ...(grades.data?.summary.average !== null && grades.data?.summary.average !== undefined && grades.data.summary.average < 4 ? [`Promedio general bajo 4.0 (${grades.data.summary.average.toFixed(1)}).`] : []),
    ...((grades.data?.summary.subjects ?? []).filter((subject) => subject.average !== null && subject.average < 4).slice(0, 3).map((subject) => `${subject.subject}: promedio ${subject.average?.toFixed(1)}.`)),
    ...((grades.data?.summary.pending ?? 0) > 0 ? [`${grades.data?.summary.pending} notas pendientes por registrar.`] : []),
    ...(attendance.data && attendance.data.summary.percentage < 85 ? [`Asistencia general bajo 85% (${attendance.data.summary.percentage}%).`] : [])
  ].slice(0, 5);

  return (
    <>
      <section className="student-dashboard-actions">
        <Link to="/horario"><CalendarDays size={17} />Ver horario</Link>
        <Link to="/calificaciones"><GraduationCap size={17} />Ver calificaciones</Link>
        <Link to="/asistencia"><ClipboardCheck size={17} />Ver asistencia</Link>
        <Link to="/documentos"><FileText size={17} />Ver materiales</Link>
      </section>

      <section className="student-dashboard-grid">
        <article className="panel student-next-class">
          <div className="panel-title-row"><h2>Próxima clase</h2><Clock size={20} /></div>
          {upcomingClass ? (
            <div className="student-feature-card">
              <span>{formatDateTime(upcomingClass.start)}</span>
              <strong>{upcomingClass.subject}</strong>
              <small>{upcomingClass.course} · {upcomingClass.teacher} · {upcomingClass.room}</small>
              <Link className="text-link" to="/horario">Abrir horario</Link>
            </div>
          ) : <EmptyState title="Sin próximas clases" description="No hay clases programadas próximas en tu horario visible." />}
        </article>

        <article className="panel">
          <div className="panel-title-row"><h2>Alertas académicas</h2><AlertTriangle size={20} /></div>
          <div className="student-alert-list">
            {alerts.map((alert) => <span key={alert}><AlertTriangle size={16} />{alert}</span>)}
            {!alerts.length && !grades.loading && !attendance.loading && <span className="ok"><CheckCircle2 size={16} />Sin alertas académicas críticas.</span>}
            {(grades.loading || attendance.loading) && <LoadingState label="Cargando alertas..." />}
          </div>
        </article>
      </section>

      <section className="student-dashboard-grid three">
        <DashboardList title="Próximas evaluaciones" icon={<ClipboardCheck size={20} />} empty="Sin evaluaciones próximas">
          {upcomingAssessments.map((item) => (
            <article key={item.id} className="student-list-row">
              <strong>{item.title}</strong>
              <span>{item.subject}</span>
              <small>{formatDate(item.date)} · {item.section}</small>
            </article>
          ))}
        </DashboardList>

        <DashboardList title="Últimas calificaciones" icon={<GraduationCap size={20} />} empty="Sin calificaciones registradas">
          {recentGrades.map((item: GradebookHistoryItem) => (
            <article key={item.id} className="student-list-row score">
              <strong>{item.evaluation}</strong>
              <span>{item.subject}</span>
              <small>{formatDate(item.date)} · {item.status}</small>
              <em>{scoreLabel(item.score)}</em>
            </article>
          ))}
        </DashboardList>

        <DashboardList title="Asistencia reciente" icon={<ClipboardCheck size={20} />} empty="Sin asistencia registrada">
          {recentAttendance.map((item) => (
            <article key={item.id} className="student-list-row">
              <strong>{formatDate(item.date)}</strong>
              <span>{item.subject}</span>
              <small>{item.section}</small>
              <span className={`attendance-badge ${item.status}`}>{attendanceLabel(item.status)}</span>
            </article>
          ))}
        </DashboardList>

        <DashboardList title="Observaciones" icon={<AlertTriangle size={20} />} empty="Sin observaciones visibles">
          {observations.map((item) => (
            <article key={item.id} className="student-list-row">
              <strong>{item.body}</strong>
              <span className={`priority-badge ${item.type === 'positiva' ? 'normal' : item.type === 'negativa' ? 'urgente' : 'alta'}`}>{item.type}</span>
              <small>{formatDate(item.date)} · {item.author}</small>
            </article>
          ))}
        </DashboardList>
      </section>

      <section className="student-dashboard-grid">
        <DashboardList title="Comunicados relevantes" icon={<Bell size={20} />} empty="Sin comunicados recientes">
          {dashboard.announcements.slice(0, 5).map((item) => (
            <article key={item.id} className="student-list-row">
              <strong>{item.title}</strong>
              <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
            </article>
          ))}
        </DashboardList>

        <DashboardList title="Materiales recientes" icon={<FileText size={20} />} empty="Sin materiales recientes">
          {recentMaterials.map((item) => (
            <article key={item.id} className="student-list-row">
              <strong>{item.title}</strong>
              <span>{item.subject}</span>
              <small>{formatDate(item.updatedAt)} · {item.category}</small>
            </article>
          ))}
        </DashboardList>
      </section>
    </>
  );
}

function DashboardList({ title, icon, empty, children }: { title: string; icon: ReactNode; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);
  return (
    <article className="panel student-dashboard-list">
      <div className="panel-title-row"><h2>{title}</h2>{icon}</div>
      <div className="student-list-body">
        {hasItems ? items : <EmptyState title={empty} />}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const dashboard = useAsyncData(loadMyDashboard, emptyDashboard);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);
  const [title, description] = dashboardCopy(dashboard.data.role);
  const sections = dashboard.data.sections;
  const observations = ((dashboard.data as RoleDashboard & { observations?: DashboardObservation[] }).observations ?? []).slice(0, 5);
  const lowCoverage = sections.filter((section) => section.students === 0 || !section.subjects.length);

  return (
    <div className="page-stack institutional-dashboard">
      <PageHeader
        eyebrow="Intranet escolar"
        title={title}
        description={description}
        actions={<RoleBadge role={dashboard.data.role} />}
      />

      {dashboard.error && <ErrorState />}
      {dashboard.loading && <LoadingState label="Cargando panel institucional..." />}

      {!dashboard.loading && dashboard.data.role === 'student' && <StudentPortal dashboard={dashboard.data} schedule={schedule.data} />}

      {dashboard.data.role !== 'student' && (
        <>

      <section className="kpi-grid">
        {dashboard.data.stats.map((kpi, index) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} tone={kpi.tone} icon={icons[index] ?? Activity} />
        ))}
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Asistencia</span>
              <h2>Tendencia semanal</h2>
            </div>
            <CheckCircle2 size={20} />
          </div>
          <div className="bar-chart" aria-label="Grafico de asistencia semanal">
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((day, index) => (
              <div key={day}>
                <span style={{ height: `${barValue(index)}%` }} />
                <small>{day}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Rendimiento</span>
              <h2>Promedios por área</h2>
            </div>
            <TrendingUp size={20} />
          </div>
          <div className="performance-list">
            {['Matemática', 'Lenguaje', 'Ciencias', 'Historia'].map((label, index) => (
              <span key={label}>
                <strong>{label}</strong>
                <em><i style={{ width: `${[78, 84, 72, 80][index]}%` }} /></em>
                <small>{[5.8, 6.1, 5.4, 5.9][index].toFixed(1)}</small>
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-title-row">
            <h2>{dashboard.data.role === 'guardian' ? 'Estudiantes vinculados' : 'Cursos y secciones'}</h2>
            <Link className="text-link" to="/academico">Ver académico</Link>
          </div>
          {dashboard.data.role === 'guardian' ? (
            <div className="compact-list">
              {dashboard.data.linkedStudents.map((student) => <span key={student.id}><Users size={16} /> {student.name} · {student.relationship}</span>)}
            </div>
          ) : (
            <div className="section-grid">
              {sections.slice(0, 4).map((section) => <SectionCard key={section.id} {...section} />)}
            </div>
          )}
          {!sections.length && !dashboard.data.linkedStudents.length && <EmptyState title="Sin asignaciones" description="Las asignaciones apareceran cuando se configure la informacion escolar." />}
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Alertas académicas</h2>
            <AlertTriangle size={20} />
          </div>
          <div className="alert-list">
            {lowCoverage.slice(0, 3).map((section) => (
              <span key={section.id}><AlertTriangle size={16} /> {section.name}: revisar estudiantes o asignaturas asociadas.</span>
            ))}
            {!lowCoverage.length && <span><CheckCircle2 size={16} /> No hay alertas críticas configuradas para tu vista.</span>}
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel schedule-panel">
          <div className="panel-title-row">
            <h2>Horario institucional</h2>
            <Link className="text-link" to="/horario">Abrir horario</Link>
          </div>
          {schedule.data.length ? (
            ['admin', 'director', 'inspector'].includes(dashboard.data.role)
              ? <InstitutionalScheduleSummary events={schedule.data} role={dashboard.data.role} compact />
              : <PersonalScheduleCards events={schedule.data} role={dashboard.data.role} />
          ) : <EmptyState title="Sin clases programadas" />}
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Actividad reciente</h2>
            <Bell size={20} />
          </div>
          <div className="activity-list">
            {dashboard.data.announcements.slice(0, 4).map((announcement) => <span key={announcement.id}><Bell size={16} /> {announcement.title}</span>)}
            {dashboard.data.documents.slice(0, 3).map((document) => <span key={document.id}><FileText size={16} /> {document.title}</span>)}
            {dashboard.data.role === 'guardian' && observations.map((observation) => <span key={observation.id}><AlertTriangle size={16} /> {observation.student ? `${observation.student}: ` : ''}{observation.body}</span>)}
            {!dashboard.data.announcements.length && !dashboard.data.documents.length && !(dashboard.data.role === 'guardian' && observations.length) && <EmptyState title="Sin actividad reciente" />}
          </div>
          <div className="quick-actions">
            <Link to="/asistencia"><ClipboardCheck size={16} /> Asistencia</Link>
            <Link to="/academico"><BookOpen size={16} /> Académico</Link>
            <Link to="/comunicaciones"><Bell size={16} /> Comunicar</Link>
            <Link to="/solicitudes"><HelpCircle size={16} /> Tickets</Link>
            <Link to="/horario"><CalendarDays size={16} /> Horario</Link>
          </div>
        </article>
      </section>
        </>
      )}
    </div>
  );
}
