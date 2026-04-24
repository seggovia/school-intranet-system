import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { BookOpen, Clock, DoorOpen, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleCalendarEvent } from '../types';

const subjectPalette = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#047857', '#9333ea', '#0369a1'];

function colorForSubject(subject: string) {
  let hash = 0;
  for (const char of subject) hash = (hash + char.charCodeAt(0)) % subjectPalette.length;
  return subjectPalette[hash];
}

function formatTimeRange(event?: ScheduleCalendarEvent) {
  if (!event) return '';
  const start = new Date(event.start).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(event.end).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
}

function renderEventContent(arg: EventContentArg) {
  const event = arg.event.extendedProps as ScheduleCalendarEvent;

  return (
    <div className="schedule-event">
      <strong>{event.subject}</strong>
      <span>{event.teacher}</span>
      <small>{event.room} · {event.section}</small>
    </div>
  );
}

export function ScheduleCalendar({ events }: { events: ScheduleCalendarEvent[] }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ScheduleCalendarEvent | null>(null);
  const calendarEvents = useMemo(() => events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: colorForSubject(event.subject),
    borderColor: colorForSubject(event.subject),
    extendedProps: event
  })), [events]);

  function openEvent(arg: EventClickArg) {
    setSelected(arg.event.extendedProps as ScheduleCalendarEvent);
  }

  return (
    <>
      <div className="schedule-calendar">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          allDaySlot={false}
          weekends={false}
          firstDay={1}
          locale={esLocale}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:45:00"
          expandRows
          height="auto"
          dayHeaderFormat={{ weekday: 'long' }}
          headerToolbar={false}
          events={calendarEvents}
          eventContent={renderEventContent}
          eventClick={openEvent}
        />
      </div>

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="class-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Clase programada</span>
                <h2 id="class-modal-title">{selected.subject}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setSelected(null)}><X size={18} /></button>
            </header>

            <div className="class-detail-list">
              <span><UserRound size={17} /> {selected.teacher}</span>
              <span><Clock size={17} /> {formatTimeRange(selected)}</span>
              <span><BookOpen size={17} /> {selected.course}</span>
              <span><DoorOpen size={17} /> {selected.room}</span>
            </div>

            <button className="primary-button" type="button" onClick={() => navigate(`/subjects/${selected.subjectId}`)}>
              Ver asignatura
            </button>
          </section>
        </div>
      )}
    </>
  );
}
