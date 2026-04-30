import { CalendarClock, MapPin } from 'lucide-react';
import { loadEvents, loadMySchedule } from '../api';
import { PageHeader } from '../components/PageHeader';
import { InstitutionalScheduleSummary, PersonalScheduleCards } from '../components/ScheduleCalendar';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks';
import type { CalendarEvent, ScheduleCalendarEvent, User } from '../types';

export function CalendarPage({ user }: { user: User }) {
  const { data } = useAsyncData(loadEvents, [] as CalendarEvent[]);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);
  const institutional = ['admin', 'director', 'inspector'].includes(user.primaryRole);
  const title = institutional ? 'Horario institucional' : user.primaryRole === 'teacher' ? 'Mi horario docente' : user.primaryRole === 'guardian' ? 'Horario de estudiantes' : 'Mi horario de clases';
  const description = institutional
    ? 'Vista global por bloques para supervisión de clases, salas, docentes y operación escolar.'
    : 'Vista personal de clases según tu rol y asignaciones vigentes.';

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Horario" title={title} description={description} />

      <section className="panel">
        {institutional ? <InstitutionalScheduleSummary events={schedule.data} /> : <PersonalScheduleCards events={schedule.data} role={user.primaryRole} />}
      </section>

      <section className="timeline">
        {data.map((event) => (
          <article className="timeline-item" key={event.id}>
            <div className="date-pill">
              <CalendarClock size={18} />
              <span>{event.date.slice(5)}</span>
            </div>
            <div>
              <h2>{event.title}</h2>
              <p><MapPin size={16} /> {event.location}</p>
            </div>
            <StatusBadge value={event.type} />
          </article>
        ))}
      </section>
    </div>
  );
}
