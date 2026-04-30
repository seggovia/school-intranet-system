import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { BookOpen, CalendarDays, Clock, DoorOpen, Search, UserRound, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSectionStudents } from '../api';
import { EmptyState, LoadingState } from './States';
import type { ScheduleCalendarEvent, SectionStudent } from '../types';

const subjectPalette = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#047857', '#9333ea', '#0369a1'];
const dayOptions = [
  { value: '', label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' }
];

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

function eventWeekday(event: ScheduleCalendarEvent) {
  return String(new Date(event.start).getDay());
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

export function ScheduleCalendar({ events, compact = false }: { events: ScheduleCalendarEvent[]; compact?: boolean }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ScheduleCalendarEvent | null>(null);
  const [students, setStudents] = useState<SectionStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [view, setView] = useState<'agenda' | 'week'>('week');
  const [filters, setFilters] = useState({ day: '', period: 'semana', course: '', teacher: '', query: '' });
  const courseOptions = useMemo(() => Array.from(new Set(events.map((event) => event.course))).sort(), [events]);
  const teacherOptions = useMemo(() => Array.from(new Set(events.map((event) => event.teacher))).sort(), [events]);
  const filteredEvents = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesDay = !filters.day || eventWeekday(event) === filters.day;
      const matchesCourse = !filters.course || event.course === filters.course;
      const matchesTeacher = !filters.teacher || event.teacher === filters.teacher;
      const matchesQuery = !query || [event.subject, event.teacher, event.room, event.course, event.section].some((value) => value.toLowerCase().includes(query));
      return matchesDay && matchesCourse && matchesTeacher && matchesQuery;
    });
  }, [events, filters]);
  const calendarEvents = useMemo(() => filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: colorForSubject(event.subject),
    borderColor: colorForSubject(event.subject),
    extendedProps: event
  })), [filteredEvents]);

  async function openSelected(event: ScheduleCalendarEvent) {
    setSelected(event);
    setStudents(null);
    if (!event.sectionId) return;
    try {
      setStudentsLoading(true);
      setStudents(await loadSectionStudents(event.sectionId));
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }

  function openEvent(arg: EventClickArg) {
    void openSelected(arg.event.extendedProps as ScheduleCalendarEvent);
  }

  return (
    <>
      {!compact && (
        <div className="schedule-control-panel">
          <label className="admin-search">
            <Search size={17} />
            <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Buscar clase, docente, sala o curso" />
          </label>
          <select value={filters.day} onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}>{dayOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
          <select value={filters.course} onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}>
            <option value="">Todos los cursos</option>
            {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
          </select>
          <select value={filters.teacher} onChange={(event) => setFilters((current) => ({ ...current, teacher: event.target.value }))}>
            <option value="">Todos los docentes</option>
            {teacherOptions.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
          </select>
          <div className="segmented">
            <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}><CalendarDays size={15} /> Semanal</button>
            <button type="button" className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}><BookOpen size={15} /> Agenda</button>
          </div>
        </div>
      )}

      {view === 'agenda' && !compact ? (
        <div className="schedule-agenda">
          {filteredEvents.map((event) => (
            <button key={event.id} type="button" onClick={() => openSelected(event)}>
              <strong>{event.subject}</strong>
              <span>{formatTimeRange(event)} · {event.course}</span>
              <small>{event.teacher} · {event.room}</small>
            </button>
          ))}
          {!filteredEvents.length && <EmptyState title="Sin clases con esos filtros" />}
        </div>
      ) : (
        <div className={compact ? 'schedule-calendar compact' : 'schedule-calendar'}>
          <FullCalendar
            key={`${filters.period}-${compact ? 'compact' : 'full'}`}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView={filters.period === 'mes' && !compact ? 'dayGridMonth' : 'timeGridWeek'}
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
            headerToolbar={compact ? false : { left: 'prev,next today', center: 'title', right: '' }}
            events={calendarEvents}
            eventContent={renderEventContent}
            eventClick={openEvent}
          />
        </div>
      )}

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

            <div className="class-students-panel">
              <h3><Users size={17} /> Estudiantes de la clase</h3>
              {studentsLoading && <LoadingState label="Cargando estudiantes..." />}
              {!studentsLoading && students && students.length > 0 && (
                <div className="class-students-list">
                  {students.slice(0, 12).map((student) => <span key={student.id}>{student.name}</span>)}
                </div>
              )}
              {!studentsLoading && students && !students.length && <EmptyState title="Sin estudiantes disponibles" />}
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
