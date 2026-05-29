import { BookOpen, Clock, DoorOpen, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadMySchedule } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { getSubjectStatus } from '../utils/scheduleColors';
import { useAsyncData } from '../hooks';
import type { ScheduleCalendarEvent, User } from '../types';

function timeFromDate(value: string) {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function eventTimes(event: ScheduleCalendarEvent) {
  return {
    startTime: event.startsAt ?? timeFromDate(event.start),
    endTime: event.endsAt ?? timeFromDate(event.end),
  };
}

function eventWeekday(event: ScheduleCalendarEvent) {
  return event.weekday ?? new Date(event.start).getDay();
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function nextClassName(events: ScheduleCalendarEvent[]) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const next = events
    .map((event) => ({ event, startsAt: eventTimes(event).startTime }))
    .filter((item) => timeMinutes(item.startsAt) >= currentMinutes)
    .sort((a, b) => timeMinutes(a.startsAt) - timeMinutes(b.startsAt))[0];

  return next?.event.subject ?? 'Sin clases hoy';
}

function subtitleForRole(role: string) {
  if (role === 'student') return 'Tu horario semanal de clases';
  if (role === 'teacher') return 'Tus clases asignadas esta semana';
  if (['admin', 'director', 'inspector'].includes(role)) return 'Vista global de todos los horarios';
  return 'Horario semanal de clases';
}

function ScheduleStats({ events, role }: { events: ScheduleCalendarEvent[]; role: string }) {
  const today = new Date().getDay();
  const todayEvents = events.filter((event) => eventWeekday(event) === today);
  const activeToday = todayEvents.filter((event) => {
    const { startTime, endTime } = eventTimes(event);
    return getSubjectStatus(startTime, endTime) === 'active';
  }).length;
  const rooms = new Set(todayEvents.map((event) => event.room).filter(Boolean)).size;
  const teachers = new Set(todayEvents.map((event) => event.teacher).filter(Boolean)).size;
  const subjects = new Set(events.map((event) => event.subject).filter(Boolean)).size;
  const sections = new Set(events.map((event) => event.section).filter(Boolean)).size;
  const nextClass = nextClassName(todayEvents);

  if (role === 'student' || role === 'guardian') {
    return (
      <div className="institutional-schedule-kpis">
        <article>
          <BookOpen size={18} />
          <span>Clases esta semana</span>
          <strong>{events.length}</strong>
        </article>
        <article>
          <Clock size={18} />
          <span>Próxima clase</span>
          <strong>{nextClass}</strong>
        </article>
        <article>
          <BookOpen size={18} />
          <span>Asignaturas</span>
          <strong>{subjects}</strong>
        </article>
        <article>
          <UserRound size={18} />
          <span>Asistencia general</span>
          <strong><Link to="/asistencia" style={{ color: 'inherit', textDecoration: 'none' }}>Ver asistencia</Link></strong>
        </article>
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <div className="institutional-schedule-kpis">
        <article>
          <BookOpen size={18} />
          <span>Clases hoy</span>
          <strong>{todayEvents.length}</strong>
        </article>
        <article>
          <DoorOpen size={18} />
          <span>Secciones asignadas</span>
          <strong>{sections}</strong>
        </article>
        <article>
          <BookOpen size={18} />
          <span>Asignaturas</span>
          <strong>{subjects}</strong>
        </article>
        <article>
          <Clock size={18} />
          <span>Próxima clase</span>
          <strong>{nextClass}</strong>
        </article>
      </div>
    );
  }

  return (
    <div className="institutional-schedule-kpis">
      <article>
        <BookOpen size={18} />
        <span>Clases activas hoy</span>
        <strong>{activeToday}</strong>
      </article>
      <article>
        <DoorOpen size={18} />
        <span>Salas ocupadas</span>
        <strong>{rooms}</strong>
      </article>
      <article>
        <UserRound size={18} />
        <span>Docentes con clases</span>
        <strong>{teachers}</strong>
      </article>
      <article>
        <Clock size={18} />
        <span>Asignaturas semanales</span>
        <strong>{subjects}</strong>
      </article>
    </div>
  );
}

export function CalendarPage({ user }: { user: User }) {
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Horario" title="Horario institucional" description={subtitleForRole(user.primaryRole)} />

      <ScheduleStats events={schedule.data} role={user.primaryRole} />

      <section className="panel">
        <ScheduleCalendar events={schedule.data} userRole={user.primaryRole} loading={schedule.loading} />
      </section>
    </div>
  );
}
