import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Clock, MapPin, Save, Search, Users, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { loadAttendanceContext, loadAttendanceGuardian, loadAttendanceMe, loadAttendanceRecords, loadAttendanceSummary, saveAttendanceBulk } from '../api';
import { normalizeApiError, type NormalizedApiError } from '../api-error';
import { ApiErrorModal } from '../components/ApiErrorModal';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, LoadingState } from '../components/States';
import type { AttendanceContext, AttendanceHistoryItem, AttendanceRecordsResponse, AttendanceRosterRecord, AttendanceRosterStatus, AttendanceScheduleItem, AttendanceStatus, AttendanceSummary, User } from '../types';

const statusOptions: Array<{ value: AttendanceRosterStatus; label: string }> = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'justificado', label: 'Justificado' },
  { value: 'atrasado', label: 'Tarde' }
];

const statusFilters: Array<{ value: AttendanceRosterStatus | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  ...statusOptions,
  { value: 'sin_registrar', label: 'Sin marcar' }
];

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type ConfirmState = { title: string; message: ReactNode; action: () => void | Promise<void>; danger?: boolean };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function weekdayFromDate(date: string) {
  if (!date) return -1;
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function formatDate(date: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function scheduleLabel(schedule: AttendanceScheduleItem) {
  return `${schedule.weekdayName} ${schedule.startsAt}-${schedule.endsAt}`;
}

function summaryFromRows(rows: AttendanceRosterRecord[]) {
  return {
    presente: rows.filter((row) => row.status === 'presente').length,
    ausente: rows.filter((row) => row.status === 'ausente').length,
    atrasado: rows.filter((row) => row.status === 'atrasado').length,
    justificado: rows.filter((row) => row.status === 'justificado').length,
    sin_registrar: rows.filter((row) => row.status === 'sin_registrar').length
  };
}

function rowSignature(row: AttendanceRosterRecord) {
  return `${row.status}|${row.note || ''}`;
}

function SummaryCards({ values }: { values: Partial<AttendanceSummary> & { sin_registrar?: number } }) {
  const cards = [
    ['Presentes', values.presente ?? 0, CheckCircle2],
    ['Ausentes', values.ausente ?? 0, XCircle],
    ['Tarde', values.atrasado ?? 0, Clock],
    ['Justificados', values.justificado ?? 0, Users],
    ['Sin marcar', values.sin_registrar ?? 0, Search]
  ] as const;
  return <section className="attendance-summary-cards">{cards.map(([label, value, Icon]) => <article key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></article>)}</section>;
}

function ConfirmModal({ confirm, onClose, onApiError }: { confirm: ConfirmState; onClose: () => void; onApiError: (error: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <section className="admin-confirm">
        {confirm.danger ? <AlertTriangle /> : <CheckCircle2 />}
        <div>
          <h2>{confirm.title}</h2>
          <p>{confirm.message}</p>
        </div>
        <div><button className="secondary-button" onClick={onClose}>Cancelar</button><button className={confirm.danger ? 'danger-button' : 'primary-button'} disabled={busy} onClick={async () => { try { setBusy(true); await confirm.action(); onClose(); } catch (err) { onClose(); onApiError(err); } finally { setBusy(false); } }}>Confirmar</button></div>
      </section>
    </div>
  );
}

function HistoryTable({ rows }: { rows: AttendanceHistoryItem[] }) {
  if (!rows.length) return <EmptyState title="Sin historial de asistencia" />;
  return (
    <div className="attendance-history-table">
      {rows.map((row) => <article key={row.id}><span>{row.date}</span><strong>{row.subject}</strong><span>{row.section}</span><span className={`attendance-badge ${row.status}`}>{row.status === 'atrasado' ? 'tarde' : row.status}</span><small>{row.note || '-'}</small></article>)}
    </div>
  );
}

export function AttendancePage({ user }: { user: User }) {
  const canManage = ['admin', 'director', 'teacher', 'inspector'].includes(user.primaryRole);
  if (canManage) return <ManageAttendance user={user} />;
  if (user.primaryRole === 'guardian') return <GuardianAttendance />;
  return <StudentAttendance />;
}

function ManageAttendance({ user }: { user: User }) {
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('cursoId') ?? '';
  const subjectParam = searchParams.get('asignaturaId') ?? '';
  const dateParam = searchParams.get('fecha') ?? '';
  const [context, setContext] = useState<AttendanceContext | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<AttendanceRecordsResponse | null>(null);
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState<NormalizedApiError | null>(null);
  const [summary, setSummary] = useState<{ sections: Array<{ name: string; summary: AttendanceSummary }> } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceRosterStatus | 'todos'>('todos');
  const isTeacher = user.primaryRole === 'teacher';
  const futureDate = date > today();
  const selectedWeekday = weekdayFromDate(date);
  const section = context?.sections.find((item) => item.id === sectionId);
  const subjects = section?.subjects ?? [];
  const subject = subjects.find((item) => item.id === subjectId);
  const weeklySchedules = subject?.schedules ?? [];
  const schedulesForDay = weeklySchedules.filter((schedule) => schedule.weekday === selectedWeekday);
  const hasClassToday = schedulesForDay.length > 0;
  const counts = summaryFromRows(records?.students ?? []);
  const pendingChanges = useMemo(() => records?.students.filter((row) => baseline[row.studentId] !== rowSignature(row)).length ?? 0, [baseline, records]);
  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    return (records?.students ?? []).filter((student) => {
      const matchesQuery = !query || [student.name, student.email, student.rut].some((value) => (value ?? '').toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'todos' || student.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [records, statusFilter, studentQuery]);

  useEffect(() => {
    Promise.all([loadAttendanceContext(), ['admin', 'director', 'inspector'].includes(user.primaryRole) ? loadAttendanceSummary() : Promise.resolve(null)])
      .then(([nextContext, adminSummary]) => {
        setContext(nextContext);
        setSummary(adminSummary);
        const requestedSection = nextContext.sections.find((item) => item.id === sectionParam);
        const initialSection = requestedSection ?? (!isTeacher ? nextContext.sections[0] : undefined);
        const requestedSubject = initialSection?.subjects.find((item) => item.id === subjectParam);
        if (initialSection) {
          setSectionId(initialSection.id);
          setSubjectId((requestedSubject ?? initialSection.subjects[0])?.id ?? '');
        }
        if (dateParam) setDate(dateParam);
      })
      .finally(() => setLoading(false));
  }, [dateParam, isTeacher, sectionParam, subjectParam, user.primaryRole]);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => { setNotice(''); setError(''); }, 4500);
    return () => window.clearTimeout(timer);
  }, [error, notice]);

  function runWithUnsaved(action: () => void) {
    if (!pendingChanges) {
      action();
      return;
    }
    setConfirm({
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      danger: true,
      action
    });
  }

  function showApiError(error: unknown) {
    const normalized = normalizeApiError(error);
    setApiError(normalized);
    if (normalized.kind === 'unauthorized') {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('school-session-expired')), 1200);
    }
  }

  function showValidationModal(message: string) {
    setApiError({ kind: 'validation', status: 400, title: 'Datos invalidos', message, fieldErrors: {} });
  }

  function selectAssignment(nextSectionId: string, nextSubjectId: string) {
    runWithUnsaved(() => {
      setSectionId(nextSectionId);
      setSubjectId(nextSubjectId);
      setRecords(null);
      setBaseline({});
      setStudentQuery('');
      setStatusFilter('todos');
      setError('');
    });
  }

  function changeSection(nextSectionId: string) {
    runWithUnsaved(() => {
      const nextSection = context?.sections.find((item) => item.id === nextSectionId);
      setSectionId(nextSectionId);
      setSubjectId(nextSection?.subjects[0]?.id ?? '');
      setRecords(null);
      setBaseline({});
      setError('');
    });
  }

  function changeSubject(nextSubjectId: string) {
    runWithUnsaved(() => {
      setSubjectId(nextSubjectId);
      setRecords(null);
      setBaseline({});
      setError('');
    });
  }

  function changeDate(nextDate: string) {
    runWithUnsaved(() => {
      setDate(nextDate);
      setRecords(null);
      setBaseline({});
      setError('');
    });
  }

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    if (!sectionId || !subjectId || !date) {
      setError('Selecciona sección, asignatura y fecha.');
      return;
    }
    if (futureDate) {
      showValidationModal('No se puede registrar asistencia futura.');
      return;
    }
    if (!hasClassToday) {
      setRecords(null);
      setBaseline({});
      showValidationModal('No hay clase programada para esta asignatura en la fecha seleccionada.');
      return;
    }
    try {
      setRosterLoading(true);
      const next = await loadAttendanceRecords({ sectionId, subjectId, date });
      setRecords(next);
      setBaseline(Object.fromEntries(next.students.map((student) => [student.studentId, rowSignature(student)])));
    } catch (err) {
      showApiError(err);
    } finally {
      setRosterLoading(false);
    }
  }

  function updateStudent(studentId: string, patch: Partial<AttendanceRosterRecord>) {
    setRecords((current) => current ? { ...current, students: current.students.map((student) => student.studentId === studentId ? { ...student, ...patch } : student) } : current);
  }

  function markAll(status: AttendanceRosterStatus) {
    setRecords((current) => current ? { ...current, students: current.students.map((student) => ({ ...student, status })) } : current);
  }

  async function save() {
    if (!records || futureDate || !pendingChanges) return;
    setConfirm({
      title: 'Guardar asistencia',
      message: `¿Guardar asistencia de ${records.subject?.name ?? 'la asignatura'} para ${records.section.name} el día ${formatDate(records.date)}?`,
      action: async () => {
        setSaving(true);
        setError('');
        try {
          await saveAttendanceBulk({ sectionId, subjectId, date, records: records.students.filter((row) => row.status !== 'sin_registrar').map((row) => ({ studentId: row.studentId, status: row.status as AttendanceStatus, note: row.note || undefined })) });
          setNotice('Asistencia guardada correctamente.');
          await load();
        } catch (err) {
          showApiError(err);
        } finally {
          setSaving(false);
        }
      }
    });
  }

  if (loading) return <LoadingState label="Cargando asistencia..." />;
  if (!context?.sections.length) return <div className="page-stack"><PageHeader eyebrow="Asistencia" title="Sin secciones asignadas" description="No hay secciones/asignaturas disponibles para registrar asistencia." /></div>;

  return (
    <div className="page-stack attendance-page">
      <PageHeader eyebrow="Asistencia" title={isTeacher ? 'Mis cursos / asignaturas' : 'Asistencia'} description={isTeacher ? 'Selecciona una asignatura asignada para tomar asistencia.' : 'Registro diario por sección, asignatura y estudiante.'} />
      {notice && <div className="admin-notice success" onClick={() => setNotice('')}>{notice}</div>}
      {error && <div className="alert" onClick={() => setError('')}>{error}</div>}
      {isTeacher && <TeacherAssignments context={context} selected={`${sectionId}:${subjectId}`} onSelect={selectAssignment} />}
      {(!isTeacher || sectionId) && (
        <>
          <SummaryCards values={counts} />
          <section className="panel attendance-class-panel">
            <div className="attendance-class-heading">
              <div>
                <span>{section?.name ?? 'Sección'}</span>
                <h2>{subject?.name ?? 'Asignatura'}</h2>
              </div>
              <div className="attendance-class-meta">
                <span><CalendarDays size={15} />{date ? `${weekdayNames[selectedWeekday] ?? ''}, ${formatDate(date)}` : 'Sin fecha'}</span>
                <span><MapPin size={15} />{section?.classroom?.name ?? schedulesForDay[0]?.classroom?.name ?? 'Sin sala'}</span>
              </div>
            </div>
            <form className="attendance-filters" onSubmit={load}>
              {!isTeacher && <label>Sección<select value={sectionId} onChange={(event) => changeSection(event.target.value)}>{context.sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              {!isTeacher && <label>Asignatura<select value={subjectId} onChange={(event) => changeSubject(event.target.value)}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              <label>Fecha<input type="date" value={date} max={today()} onChange={(event) => changeDate(event.target.value)} /></label>
              <button className="primary-button" disabled={futureDate || !subjectId || !date || !hasClassToday || rosterLoading}>{rosterLoading ? 'Cargando...' : 'Cargar asistencia'}</button>
            </form>
            <WeekSchedule schedules={weeklySchedules} selectedWeekday={selectedWeekday} />
            {!futureDate && !hasClassToday && <div className="attendance-warning"><AlertTriangle size={17} />No hay clase programada para esta asignatura en la fecha seleccionada.</div>}
          </section>
          {records ? (
            <section className="panel attendance-roster">
              <div className="attendance-toolbar">
                <label className="admin-search"><Search size={17} /><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Buscar por nombre, correo o RUT" /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AttendanceRosterStatus | 'todos')}>{statusFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </div>
              <div className="attendance-actions"><button className="secondary-button" onClick={() => markAll('presente')}>Marcar todos presentes</button><button className="secondary-button" onClick={() => markAll('ausente')}>Marcar todos ausentes</button><button className="secondary-button" onClick={() => markAll('sin_registrar')}>Limpiar selección</button><span>{pendingChanges} cambios pendientes</span><button className="primary-button" onClick={save} disabled={saving || futureDate || !pendingChanges}><Save size={17} />{saving ? 'Guardando...' : 'Guardar asistencia del día'}</button></div>
              <div className="attendance-student-list">
                {filteredStudents.map((student) => <AttendanceStudentRow key={student.studentId} student={student} onChange={(status) => updateStudent(student.studentId, { status })} onNote={(note) => updateStudent(student.studentId, { note })} />)}
              </div>
              {!filteredStudents.length && <EmptyState title="Sin estudiantes" description="No hay estudiantes con esos filtros." />}
            </section>
          ) : <EmptyState title="Carga una asistencia" description="Selecciona un día con clase para ver el listado de estudiantes." />}
          {summary && <section className="panel"><h3>Resumen por sección de hoy</h3><div className="attendance-history-table">{summary.sections.map((item) => <article key={item.name}><strong>{item.name}</strong><span>{item.summary.percentage}% asistencia</span><span>{item.summary.ausente} ausentes</span><span>{item.summary.atrasado} atrasos</span></article>)}</div></section>}
        </>
      )}
      {confirm && <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} onApiError={showApiError} />}
      {apiError && <ApiErrorModal error={apiError} onClose={() => setApiError(null)} />}
    </div>
  );
}

function TeacherAssignments({ context, selected, onSelect }: { context: AttendanceContext; selected: string; onSelect: (sectionId: string, subjectId: string) => void }) {
  const cards = context.sections.flatMap((section) => section.subjects.map((subject) => ({ section, subject })));
  if (!cards.length) return <EmptyState title="Sin cursos asignados" description="No hay cursos/asignaturas con horario asignado a tu usuario." />;
  return (
    <section className="attendance-course-grid">
      {cards.map(({ section, subject }) => {
        const active = selected === `${section.id}:${subject.id}`;
        return (
          <article key={`${section.id}-${subject.id}`} className={`attendance-course-card ${active ? 'active' : ''}`}>
            <div><span>{section.name}</span><h2>{subject.name}</h2></div>
            <p><MapPin size={15} />{section.classroom?.name ?? subject.schedules?.[0]?.classroom?.name ?? 'Sin sala'}</p>
            <div className="attendance-card-schedules">{(subject.schedules ?? []).map((schedule) => <small key={schedule.id}>{scheduleLabel(schedule)}</small>)}</div>
            <button className="primary-button" onClick={() => onSelect(section.id, subject.id)}>Tomar asistencia</button>
          </article>
        );
      })}
    </section>
  );
}

function WeekSchedule({ schedules, selectedWeekday }: { schedules: AttendanceScheduleItem[]; selectedWeekday: number }) {
  const byWeekday = new Map(schedules.map((schedule) => [schedule.weekday, schedule]));
  return (
    <div className="attendance-week-strip">
      {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
        const schedule = byWeekday.get(weekday);
        return <button key={weekday} type="button" disabled={!schedule} className={`${schedule ? 'has-class' : ''} ${weekday === selectedWeekday ? 'selected' : ''}`}><strong>{weekdayNames[weekday]}</strong><span>{schedule ? `${schedule.startsAt}-${schedule.endsAt}` : 'Sin clase'}</span></button>;
      })}
    </div>
  );
}

function AttendanceStudentRow({ student, onChange, onNote }: { student: AttendanceRosterRecord; onChange: (status: AttendanceRosterStatus) => void; onNote: (note: string) => void }) {
  return (
    <article className={`attendance-student-card ${student.registered ? 'updated' : ''}`}>
      <div className="attendance-student-info">
        <strong>{student.name}</strong>
        <small>{student.email}</small>
        <small>RUT / identificador: {student.rut || 'Sin registro'}</small>
      </div>
      <div className="attendance-status-pills">{statusOptions.map((option) => <button key={option.value} type="button" className={`status-pill ${option.value} ${student.status === option.value ? 'active' : ''}`} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>
      <input value={student.note} onChange={(event) => onNote(event.target.value)} placeholder="Nota opcional" />
      {student.registered && <span className="attendance-updated">Editando registro existente</span>}
    </article>
  );
}

function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<{ summary: AttendanceSummary; history: AttendanceHistoryItem[] } | null>(null);
  useEffect(() => { loadAttendanceMe().then(setData); }, []);
  if (!data) return <LoadingState label="Cargando asistencia..." />;
  const subject = searchParams.get('asignatura') ?? '';
  const section = searchParams.get('curso') ?? '';
  const filteredHistory = data.history.filter((row) => (!subject || row.subject === subject) && (!section || row.section === section));
  const filtered = Boolean(subject || section);
  return <div className="page-stack"><PageHeader eyebrow="Asistencia" title={filtered ? 'Asistencia filtrada' : 'Mi asistencia'} description={filtered ? [section, subject].filter(Boolean).join(' · ') : 'Resumen e historial de tus registros.'} /><SummaryCards values={data.summary} /><section className="panel"><HistoryTable rows={filtered ? filteredHistory : data.history} /></section></div>;
}

function GuardianAttendance() {
  const [data, setData] = useState<{ students: Array<{ id: string; name: string; summary: AttendanceSummary; history: AttendanceHistoryItem[] }> } | null>(null);
  const [studentId, setStudentId] = useState('');
  useEffect(() => { loadAttendanceGuardian().then((next) => { setData(next); setStudentId(next.students[0]?.id ?? ''); }); }, []);
  const student = useMemo(() => data?.students.find((item) => item.id === studentId), [data, studentId]);
  if (!data) return <LoadingState label="Cargando asistencia..." />;
  return <div className="page-stack"><PageHeader eyebrow="Asistencia" title="Asistencia del estudiante" description="Consulta la asistencia de estudiantes vinculados." /><section className="panel attendance-filters"><label>Estudiante<select value={studentId} onChange={(event) => setStudentId(event.target.value)}>{data.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section>{student ? <><SummaryCards values={student.summary} /><section className="panel"><HistoryTable rows={student.history} /></section></> : <EmptyState title="Sin estudiantes vinculados" />}</div>;
}
