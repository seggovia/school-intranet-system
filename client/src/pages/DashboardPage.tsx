import { Activity, AlertTriangle, Bell, BookOpen, CheckCircle2, FileText, TrendingUp, Users } from 'lucide-react';
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
const icons = [TrendingUp, Users, CheckCircle2, AlertTriangle];

function dashboardCopy(role: string) {
  if (role === 'teacher') return ['Espacio docente', 'Clases, asistencia, calificaciones y materiales de tus cursos asignados.'];
  if (role === 'student') return ['Portal del estudiante', 'Tus asignaturas, horario semanal, asistencia, calificaciones y materiales escolares.'];
  if (role === 'guardian') return ['Portal del apoderado', 'Avance de estudiantes vinculados, asistencia, comunicados y solicitudes escolares.'];
  if (role === 'inspector') return ['Asistencia y registros', 'Vista operativa para seguimiento de asistencia y registros estudiantiles.'];
  return ['Panel institucional', 'Indicadores administrativos, operacion escolar, gestion academica y comunicaciones.'];
}

export function DashboardPage() {
  const dashboard = useAsyncData(loadMyDashboard, emptyDashboard);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);
  const [title, description] = dashboardCopy(dashboard.data.role);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistema de Intranet Colegio"
        title={title}
        description={description}
        actions={<RoleBadge role={dashboard.data.role} />}
      />

      {dashboard.error && <ErrorState />}
      {dashboard.loading && <LoadingState label="Cargando tu espacio de trabajo..." />}

      <section className="kpi-grid">
        {dashboard.data.stats.map((kpi, index) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} tone={kpi.tone} icon={icons[index] ?? Activity} />
        ))}
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <h2>{dashboard.data.role === 'guardian' ? 'Estudiantes vinculados' : 'Cursos asignados'}</h2>
          {dashboard.data.role === 'guardian' ? (
            <div className="compact-list">
              {dashboard.data.linkedStudents.map((student) => <span key={student.id}><Users size={16} /> {student.name} · {student.relationship}</span>)}
            </div>
          ) : (
            <div className="section-grid">
              {dashboard.data.sections.map((section) => <SectionCard key={section.id} {...section} />)}
            </div>
          )}
          {!dashboard.data.sections.length && !dashboard.data.linkedStudents.length && <EmptyState title="Sin asignaciones" description="Las asignaciones apareceran cuando se configure la informacion escolar." />}
        </article>

        <article className="panel schedule-panel">
          <h2>Horario semanal</h2>
          {schedule.data.length ? <ScheduleCalendar events={schedule.data} /> : <EmptyState title="Sin clases programadas" />}
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <h2><Bell size={18} /> Comunicados recientes</h2>
          <div className="compact-list">
            {dashboard.data.announcements.map((announcement) => <span key={announcement.id}>{announcement.title}</span>)}
          </div>
        </article>

        <article className="panel">
          <h2><FileText size={18} /> Materiales y documentos</h2>
          <div className="compact-list">
            {dashboard.data.documents.slice(0, 5).map((document) => <span key={document.id}><BookOpen size={16} /> {document.title}</span>)}
          </div>
        </article>
      </section>
    </div>
  );
}
