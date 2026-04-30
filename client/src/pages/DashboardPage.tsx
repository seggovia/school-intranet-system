import { Activity, AlertTriangle, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, GraduationCap, HelpCircle, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadMyDashboard, loadMySchedule } from '../api';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { SectionCard } from '../components/SectionCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { StatCard } from '../components/StatCard';
import { useAsyncData } from '../hooks';
import type { RoleDashboard, ScheduleCalendarEvent } from '../types';

const emptyDashboard: RoleDashboard = { role: 'student', profile: { id: '', name: '', email: '', roles: [] }, stats: [], sections: [], linkedStudents: [], announcements: [], documents: [] };
const icons = [Users, ClipboardCheck, GraduationCap, HelpCircle, TrendingUp, AlertTriangle];

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

export function DashboardPage() {
  const dashboard = useAsyncData(loadMyDashboard, emptyDashboard);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);
  const [title, description] = dashboardCopy(dashboard.data.role);
  const sections = dashboard.data.sections;
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
          {schedule.data.length ? <ScheduleCalendar events={schedule.data} compact /> : <EmptyState title="Sin clases programadas" />}
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Actividad reciente</h2>
            <Bell size={20} />
          </div>
          <div className="activity-list">
            {dashboard.data.announcements.slice(0, 4).map((announcement) => <span key={announcement.id}><Bell size={16} /> {announcement.title}</span>)}
            {dashboard.data.documents.slice(0, 3).map((document) => <span key={document.id}><FileText size={16} /> {document.title}</span>)}
            {!dashboard.data.announcements.length && !dashboard.data.documents.length && <EmptyState title="Sin actividad reciente" />}
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
    </div>
  );
}
