import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Clock, DoorOpen, Eye, RotateCcw, Search, UserRound, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSectionStudents } from '../api';
import { EmptyState, LoadingState } from './States';
import type { ScheduleCalendarEvent, SectionStudent } from '../types';

const subjectPalette = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#047857', '#9333ea', '#0369a1'];
const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayOptions = [
  { value: '', label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' }
];

type Block = {
  key: string;
  weekday: number;
  day: string;
  startsAt: string;
  endsAt: string;
  classes: ScheduleCalendarEvent[];
};

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
  return String(event.weekday ?? new Date(event.start).getDay());
}

function eventTime(event: ScheduleCalendarEvent) {
  return {
    startsAt: event.startsAt ?? new Date(event.start).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    endsAt: event.endsAt ?? new Date(event.end).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  };
}

function getUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function matchesQuery(event: ScheduleCalendarEvent, query: string) {
  if (!query) return true;
  return [event.subject, event.teacher, event.room, event.course, event.section, event.level ?? ''].some((value) => value.toLowerCase().includes(query));
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

function useClassDetails() {
  const [selected, setSelected] = useState<ScheduleCalendarEvent | null>(null);
  const [students, setStudents] = useState<SectionStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

  async function openSelected(event: ScheduleCalendarEvent) {
    setSelected(event);
    setStudents(null);
    if (event.students?.length) {
      setStudents(event.students.map((student) => ({ id: student.id, name: student.name, enrollmentId: '' })));
      return;
    }
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

  return { selected, students, studentsLoading, openSelected, closeSelected: () => setSelected(null) };
}

function DetailModal({ selected, students, studentsLoading, onClose }: { selected: ScheduleCalendarEvent; students: SectionStudent[] | null; studentsLoading: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="class-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Clase programada</span>
            <h2 id="class-modal-title">{selected.subject}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
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

        <div className="class-quick-actions">
          <button className="secondary-button" type="button" onClick={() => navigate('/academico')}>Ver curso</button>
          <button className="secondary-button" type="button">Ver profesor</button>
          <button className="secondary-button" type="button">Ver sala</button>
          <button className="primary-button" type="button" onClick={() => navigate('/asistencia')}>Ver asistencia</button>
        </div>
      </section>
    </div>
  );
}

export function InstitutionalScheduleSummary({ events, compact = false }: { events: ScheduleCalendarEvent[]; compact?: boolean }) {
  const { selected, students, studentsLoading, openSelected, closeSelected } = useClassDetails();
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [filters, setFilters] = useState({ day: '', from: '', to: '', course: '', teacher: '', room: '', subject: '', level: '', query: '' });
  const courseOptions = useMemo(() => getUnique(events.map((event) => event.course)), [events]);
  const teacherOptions = useMemo(() => getUnique(events.map((event) => event.teacher)), [events]);
  const roomOptions = useMemo(() => getUnique(events.map((event) => event.room)), [events]);
  const subjectOptions = useMemo(() => getUnique(events.map((event) => event.subject)), [events]);
  const levelOptions = useMemo(() => getUnique(events.map((event) => event.level ?? event.course.split(' ')[1])), [events]);
  const filteredEvents = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return events.filter((event) => {
      const { startsAt, endsAt } = eventTime(event);
      return (!filters.day || eventWeekday(event) === filters.day)
        && (!filters.from || startsAt >= filters.from)
        && (!filters.to || endsAt <= filters.to)
        && (!filters.course || event.course === filters.course)
        && (!filters.teacher || event.teacher === filters.teacher)
        && (!filters.room || event.room === filters.room)
        && (!filters.subject || event.subject === filters.subject)
        && (!filters.level || event.level === filters.level || event.course.includes(filters.level))
        && matchesQuery(event, query);
    });
  }, [events, filters]);
  const blocks = useMemo(() => {
    const grouped = new Map<string, Block>();
    filteredEvents.forEach((event) => {
      const weekday = Number(eventWeekday(event));
      const { startsAt, endsAt } = eventTime(event);
      const key = `${weekday}-${startsAt}-${endsAt}`;
      const current = grouped.get(key) ?? { key, weekday, day: weekdayNames[weekday] ?? 'Día', startsAt, endsAt, classes: [] };
      current.classes.push(event);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt));
  }, [filteredEvents]);
  const todayWeekday = new Date().getDay();
  const todayEvents = events.filter((event) => Number(eventWeekday(event)) === todayWeekday);
  const activeTeachers = new Set(todayEvents.map((event) => event.teacher)).size;
  const occupiedRooms = new Set(todayEvents.map((event) => event.room)).size;
  const unusedRooms = roomOptions.filter((room) => !todayEvents.some((event) => event.room === room)).length;
  const teachersWithoutLoad = Math.max(0, teacherOptions.length - activeTeachers);

  function clearFilters() {
    setFilters({ day: '', from: '', to: '', course: '', teacher: '', room: '', subject: '', level: '', query: '' });
  }

  return (
    <>
      {!compact && (
        <div className="institutional-schedule-filters">
          <label className="admin-search"><Search size={17} /><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Buscar asignatura, curso, docente o sala" /></label>
          <select value={filters.day} onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}>{dayOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <input type="time" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} aria-label="Hora inicio" />
          <input type="time" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} aria-label="Hora término" />
          <select value={filters.course} onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}><option value="">Todos los cursos</option>{courseOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.teacher} onChange={(event) => setFilters((current) => ({ ...current, teacher: event.target.value }))}><option value="">Todos los profesores</option>{teacherOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.room} onChange={(event) => setFilters((current) => ({ ...current, room: event.target.value }))}><option value="">Todas las salas</option>{roomOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.subject} onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value }))}><option value="">Todas las asignaturas</option>{subjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}><option value="">Todos los niveles</option>{levelOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" className="secondary-button" onClick={clearFilters}><RotateCcw size={16} /> Limpiar filtros</button>
        </div>
      )}

      <section className="institutional-schedule-kpis">
        <article><CheckCircle2 size={18} /><strong>{todayEvents.length}</strong><span>Clases activas hoy</span></article>
        <article><DoorOpen size={18} /><strong>{occupiedRooms}</strong><span>Salas ocupadas hoy</span></article>
        <article><UserRound size={18} /><strong>{activeTeachers}</strong><span>Docentes con clases hoy</span></article>
        <article><AlertTriangle size={18} /><strong>0</strong><span>Alertas de choque</span></article>
        {!compact && <article><Clock size={18} /><strong>{todayEvents.length}</strong><span>Asistencias pendientes</span></article>}
        {!compact && <article><BookOpen size={18} /><strong>0</strong><span>Cursos sin horario</span></article>}
        {!compact && <article><DoorOpen size={18} /><strong>{unusedRooms}</strong><span>Salas sin uso hoy</span></article>}
        {!compact && <article><Users size={18} /><strong>{teachersWithoutLoad}</strong><span>Profesores sin carga hoy</span></article>}
      </section>

      <div className="institutional-block-list">
        {blocks.slice(0, compact ? 5 : 80).map((block) => {
          const rooms = new Set(block.classes.map((item) => item.room)).size;
          const teachers = new Set(block.classes.map((item) => item.teacher)).size;
          return (
            <button key={block.key} type="button" className="institutional-block-card" onClick={() => setSelectedBlock(block)}>
              <span>{block.day}</span>
              <strong>{block.startsAt} - {block.endsAt}</strong>
              <small>{block.classes.length} clases programadas</small>
              <small>{rooms} salas ocupadas · {teachers} docentes activos</small>
              <em><Eye size={15} /> Ver detalle</em>
            </button>
          );
        })}
        {!blocks.length && <EmptyState title="Sin bloques programados" description="Ajusta los filtros o revisa la configuración de horarios." />}
      </div>

      {selectedBlock && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedBlock(null)}>
          <section className="schedule-block-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Detalle del bloque horario</span>
                <h2>{selectedBlock.day} · {selectedBlock.startsAt} - {selectedBlock.endsAt}</h2>
                <p>{selectedBlock.classes.length} clases programadas</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setSelectedBlock(null)}><X size={18} /></button>
            </header>
            <div className="schedule-block-class-list">
              {selectedBlock.classes.map((event) => (
                <button key={event.id} type="button" onClick={() => openSelected(event)}>
                  <strong>{event.subject}</strong>
                  <span>{event.course}</span>
                  <span>{event.teacher}</span>
                  <span>{event.room}</span>
                  <small>Activo</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {selected && <DetailModal selected={selected} students={students} studentsLoading={studentsLoading} onClose={closeSelected} />}
    </>
  );
}

export function PersonalScheduleCards({ events, role }: { events: ScheduleCalendarEvent[]; role: string }) {
  const { selected, students, studentsLoading, openSelected, closeSelected } = useClassDetails();
  const [filters, setFilters] = useState({ day: '', course: '', subject: '', student: '' });
  const studentOptions = useMemo(() => getUnique(events.flatMap((event) => event.students?.map((student) => student.name) ?? [])), [events]);
  const courseOptions = useMemo(() => getUnique(events.map((event) => event.course)), [events]);
  const subjectOptions = useMemo(() => getUnique(events.map((event) => event.subject)), [events]);
  const filtered = events.filter((event) => {
    const studentMatch = !filters.student || event.students?.some((student) => student.name === filters.student);
    return (!filters.day || eventWeekday(event) === filters.day)
      && (!filters.course || event.course === filters.course)
      && (!filters.subject || event.subject === filters.subject)
      && studentMatch;
  });
  const title = role === 'teacher' ? 'Mi horario docente' : role === 'guardian' ? 'Horario de estudiantes vinculados' : 'Mi horario de clases';

  return (
    <>
      <div className="personal-schedule-header">
        <div>
          <span className="eyebrow">Horario</span>
          <h2>{title}</h2>
        </div>
      </div>
      {role !== 'student' && (
        <div className="personal-schedule-filters">
          {role === 'guardian' && <select value={filters.student} onChange={(event) => setFilters((current) => ({ ...current, student: event.target.value }))}><option value="">Todos los estudiantes</option>{studentOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
          <select value={filters.day} onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}>{dayOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={filters.course} onChange={(event) => setFilters((current) => ({ ...current, course: event.target.value }))}><option value="">Todos los cursos</option>{courseOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.subject} onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value }))}><option value="">Todas las asignaturas</option>{subjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
      )}
      <div className="personal-schedule-grid">
        {filtered.map((event) => (
          <article key={event.id} className="personal-class-card">
            <span>{weekdayNames[Number(eventWeekday(event))]} · {eventTime(event).startsAt} - {eventTime(event).endsAt}</span>
            <h3>{event.subject}</h3>
            <p>{event.course}</p>
            <small>{event.teacher} · {event.room}</small>
            <div>
              <button type="button" className="secondary-button" onClick={() => openSelected(event)}>Ver clase</button>
              {role === 'teacher' && <button type="button" className="primary-button" onClick={() => window.location.assign('/asistencia')}>Tomar asistencia</button>}
            </div>
          </article>
        ))}
        {!filtered.length && <EmptyState title="Sin clases programadas" />}
      </div>
      {selected && <DetailModal selected={selected} students={students} studentsLoading={studentsLoading} onClose={closeSelected} />}
    </>
  );
}

export function ScheduleCalendar({ events, compact = false }: { events: ScheduleCalendarEvent[]; compact?: boolean }) {
  const { selected, students, studentsLoading, openSelected, closeSelected } = useClassDetails();
  const [view, setView] = useState<'agenda' | 'week'>('week');
  const [filters, setFilters] = useState({ day: '', period: 'semana', course: '', teacher: '', query: '' });
  const courseOptions = useMemo(() => getUnique(events.map((event) => event.course)), [events]);
  const teacherOptions = useMemo(() => getUnique(events.map((event) => event.teacher)), [events]);
  const filteredEvents = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return events.filter((event) => (!filters.day || eventWeekday(event) === filters.day)
      && (!filters.course || event.course === filters.course)
      && (!filters.teacher || event.teacher === filters.teacher)
      && matchesQuery(event, query));
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

      {selected && <DetailModal selected={selected} students={students} studentsLoading={studentsLoading} onClose={closeSelected} />}
    </>
  );
}
