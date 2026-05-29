import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { BookOpen, Clock, DoorOpen, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from './States';
import { ScheduleEventDetail } from './ScheduleEventDetail';
import { getSubjectColor, getSubjectStatus } from '../utils/scheduleColors';
import type { ScheduleCalendarEvent } from '../types';

type ScheduleCalendarProps = {
  events: ScheduleCalendarEvent[];
  userRole: string;
  loading: boolean;
};

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

function currentWeekMonday() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildDateForWeekday(weekday: number, time: string) {
  const date = currentWeekMonday();
  date.setDate(date.getDate() + Math.max(weekday, 1) - 1);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toFullCalendarEvent(event: ScheduleCalendarEvent) {
  const { startTime, endTime } = eventTimes(event);
  const color = getSubjectColor(event.subject);
  const weekday = eventWeekday(event);

  return {
    id: event.id,
    title: event.subject,
    start: buildDateForWeekday(weekday, startTime),
    end: buildDateForWeekday(weekday, endTime),
    backgroundColor: color.bg,
    borderColor: color.border,
    textColor: '#ffffff',
    extendedProps: {
      ...event,
      teacherName: event.teacher,
      roomName: event.room,
      sectionName: event.section,
      courseName: event.course,
      startTime,
      endTime,
      subjectName: event.subject,
    },
  };
}

function renderEventContent(arg: EventContentArg) {
  const props = arg.event.extendedProps as ScheduleCalendarEvent & {
    teacherName: string;
    roomName: string;
    startTime: string;
    endTime: string;
  };
  const status = getSubjectStatus(props.startTime, props.endTime);

  return (
    <div className="schedule-event-content">
      <div className="schedule-event-title">
        {status === 'active' && <span className="fc-event-active-dot" />}
        {arg.event.title}
      </div>
      <div className="schedule-event-detail">{props.roomName}</div>
      <div className="schedule-event-detail">{props.teacherName}</div>
    </div>
  );
}

function LoadingCalendar() {
  return (
    <div style={{ minHeight: 360, display: 'grid', placeItems: 'center', color: 'var(--color-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            border: '2px solid rgba(13, 148, 136, 0.25)',
            borderTopColor: 'var(--color-primary, #0d9488)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        Cargando horario...
      </div>
    </div>
  );
}

export function ScheduleCalendar({ events, userRole, loading }: ScheduleCalendarProps) {
  const [selected, setSelected] = useState<ScheduleCalendarEvent | null>(null);
  const calendarEvents = useMemo(() => events.map(toFullCalendarEvent), [events]);

  function handleEventClick(arg: EventClickArg) {
    const source = events.find((event) => event.id === arg.event.id);
    if (source) setSelected(source);
  }

  if (loading) return <LoadingCalendar />;
  if (!events.length) {
    return (
      <EmptyState
        title={userRole === 'teacher' ? 'Sin clases asignadas' : 'Sin horario disponible'}
        description="No hay bloques programados para esta semana."
      />
    );
  }

  return (
    <>
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale={esLocale}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
        slotMinTime="07:30:00"
        slotMaxTime="19:00:00"
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        allDaySlot={false}
        weekends={false}
        height="auto"
        events={calendarEvents}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        nowIndicator
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }}
      />
      {selected && <ScheduleEventDetail event={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function sameWeekday(event: ScheduleCalendarEvent, day: number) {
  return eventWeekday(event) === day;
}

export function InstitutionalScheduleSummary({ events, compact = false }: { events: ScheduleCalendarEvent[]; role?: string; compact?: boolean }) {
  const today = new Date().getDay();
  const todayEvents = events.filter((event) => sameWeekday(event, today));
  const activeToday = todayEvents.filter((event) => {
    const { startTime, endTime } = eventTimes(event);
    return getSubjectStatus(startTime, endTime) === 'active';
  }).length;
  const rooms = new Set(todayEvents.map((event) => event.room).filter(Boolean)).size;
  const teachers = new Set(todayEvents.map((event) => event.teacher).filter(Boolean)).size;
  const subjects = new Set(events.map((event) => event.subject).filter(Boolean)).size;

  return (
    <div className="institutional-schedule-kpis">
      <article>
        <BookOpen size={18} />
        <span>{compact ? 'Activas' : 'Clases activas hoy'}</span>
        <strong>{activeToday}</strong>
      </article>
      <article>
        <DoorOpen size={18} />
        <span>Salas ocupadas</span>
        <strong>{rooms}</strong>
      </article>
      <article>
        <UserRound size={18} />
        <span>Docentes</span>
        <strong>{teachers}</strong>
      </article>
      <article>
        <Clock size={18} />
        <span>Asignaturas</span>
        <strong>{subjects}</strong>
      </article>
    </div>
  );
}

export function PersonalScheduleCards({ events, role }: { events: ScheduleCalendarEvent[]; role: string }) {
  const today = new Date().getDay();
  const rows = events.filter((event) => sameWeekday(event, today)).slice(0, 4);

  if (!rows.length) {
    return (
      <EmptyState
        title={role === 'teacher' ? 'Sin clases para hoy' : 'Sin clases programadas'}
        description="No hay bloques registrados para el día actual."
      />
    );
  }

  return (
    <div className="schedule-card-grid">
      {rows.map((event) => {
        const { startTime, endTime } = eventTimes(event);
        const color = getSubjectColor(event.subject);
        return (
          <article className="schedule-card" key={event.id} style={{ borderLeftColor: color.border }}>
            <span>{startTime} - {endTime}</span>
            <h3>{event.subject}</h3>
            <p>{event.room} · {event.teacher}</p>
          </article>
        );
      })}
    </div>
  );
}
