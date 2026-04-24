import { CalendarClock, MapPin } from 'lucide-react';
import { loadEvents, loadMySchedule } from '../api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Timetable } from '../components/Timetable';
import { useAsyncData } from '../hooks';
import type { CalendarEvent, ScheduleItem } from '../types';

export function CalendarPage() {
  const { data } = useAsyncData(loadEvents, [] as CalendarEvent[]);
  const schedule = useAsyncData(loadMySchedule, [] as ScheduleItem[]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Calendario" title="Calendario escolar y horario semanal" description="Eventos y horario de clases segun rol, con asignatura, docente, sala, dia y hora." />

      <section className="panel">
        <h2>Horario semanal de clases</h2>
        <Timetable items={schedule.data} />
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
