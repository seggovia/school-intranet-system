import { CalendarClock, MapPin } from 'lucide-react';
import { loadEvents, loadMySchedule } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks';
import type { CalendarEvent, ScheduleCalendarEvent } from '../types';

export function CalendarPage() {
  const { data } = useAsyncData(loadEvents, [] as CalendarEvent[]);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleCalendarEvent[]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Horario" title="Horario y calendario académico" description="Filtra por día, semana, mes, curso o docente. Abre una clase para revisar datos y estudiantes." />

      <section className="panel">
        <h2>Horario de clases</h2>
        <ScheduleCalendar events={schedule.data} />
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
