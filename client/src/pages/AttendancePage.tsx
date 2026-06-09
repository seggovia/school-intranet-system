import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Clock, MapPin, Percent, Save, Search, TrendingUp, Users, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { loadAttendanceContext, loadAttendanceGuardian, loadAttendanceMe, loadAttendanceRecords, loadAttendanceSummary, saveAttendanceBulk } from '../api';
import { normalizeApiError, type NormalizedApiError } from '../api-error';
import { ApiErrorModal } from '../components/ApiErrorModal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/States';
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

const historyStatusOptions: Array<{ value: AttendanceStatus | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'presente', label: 'Presentes' },
  { value: 'ausente', label: 'Ausentes' },
  { value: 'atrasado', label: 'Atrasos' },
  { value: 'justificado', label: 'Justificados' }
];

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

function formatShortDate(date: string) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function monthLabel(month: string) {
  if (!month) return 'Todos los meses';
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}

function statusLabel(status: AttendanceStatus) {
  return status === 'atrasado' ? 'tarde' : status;
}

function dayFromHistoryDate(date: string) {
  const weekday = weekdayFromDate(date);
  return weekdayNames[weekday] ?? '-';
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

function historySummary(rows: AttendanceHistoryItem[]) {
  const total = rows.length;
  const presente = rows.filter((row) => row.status === 'presente').length;
  const ausente = rows.filter((row) => row.status === 'ausente').length;
  const atrasado = rows.filter((row) => row.status === 'atrasado').length;
  const justificado = rows.filter((row) => row.status === 'justificado').length;
  const percentage = total ? Math.round(((presente + atrasado) / total) * 100) : 0;
  return { total, percentage, presente, ausente, atrasado, justificado };
}

function progressTone(percentage: number) {
  if (percentage >= 85) return { color: '#16a34a', label: 'verde' };
  if (percentage >= 70) return { color: '#f59e0b', label: 'naranja' };
  return { color: '#dc2626', label: 'rojo' };
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
  const globalSummary = useMemo(() => {
    const sections = summary?.sections ?? [];
    const totalRegistered = sections.reduce((sum, item) => sum + (item.summary.presente ?? 0) + (item.summary.ausente ?? 0) + (item.summary.atrasado ?? 0) + (item.summary.justificado ?? 0), 0);
    const presentAndLate = sections.reduce((sum, item) => sum + (item.summary.presente ?? 0) + (item.summary.atrasado ?? 0), 0);
    const percentage = totalRegistered ? Math.round((presentAndLate / totalRegistered) * 100) : 0;
    const badge = percentage >= 85 ? 'Buen día' : percentage >= 70 ? 'Día regular' : 'Día crítico';
    return { totalRegistered, percentage, badge };
  }, [summary]);
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
  if (!context?.sections.length) {
    return (
      <div className="page-stack attendance-page">
        <PageHeader eyebrow="Asistencia" title="Asistencia" description="Registro diario por sección, asignatura y estudiante." />
        <EmptyState icon={<BookOpen size={48} />} title="Sin secciones asignadas" description="No tienes secciones activas. Contacta al administrador." />
      </div>
    );
  }

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
              <button className="primary-button" disabled={futureDate || !subjectId || !date || !hasClassToday || rosterLoading}>
                {rosterLoading ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6 }} />Cargando...</> : 'Cargar asistencia'}
              </button>
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
          {summary && <section className="panel" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Resumen por sección de hoy</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Vista rápida del estado del día por sección.</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '6px 10px', background: 'var(--surface-secondary)', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>{globalSummary.badge}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <strong style={{ fontSize: 15 }}>Total registrados hoy: {globalSummary.totalRegistered}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Porcentaje global del día: {globalSummary.percentage}%</span>
              </div>
            </div>
            <div className="attendance-history-table" style={{ display: 'grid', gap: 12 }}>
              {summary.sections.map((item) => {
                const tone = progressTone(item.summary.percentage ?? 0);
                return (
                  <article key={item.name} style={{ display: 'grid', gap: 8, padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--surface-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <strong style={{ fontSize: 15 }}>{item.name}</strong>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.summary.percentage ?? 0}% asistencia</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-secondary)', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${Math.max(0, Math.min(100, item.summary.percentage ?? 0))}%`, borderRadius: 4, background: tone.color }} />
                      </div>
                      <span style={{ minWidth: 42, textAlign: 'right', fontSize: 13, fontWeight: 700, color: tone.color }}>{item.summary.percentage ?? 0}%</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                      <span>{item.summary.ausente ?? 0} ausentes</span>
                      <span>{item.summary.atrasado ?? 0} atrasos</span>
                      <span>{item.summary.justificado ?? 0} justificados</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>}
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
  const filtered = Boolean(subject || section);
  return (
    <div className="page-stack attendance-self-page">
      <PageHeader eyebrow="Asistencia" title={filtered ? 'Asistencia filtrada' : 'Mi asistencia'} description={filtered ? [section, subject].filter(Boolean).join(' · ') : 'Resumen e historial de tus registros.'} />
      <AttendanceInsightPanel rows={data.history} initialSubject={subject} initialSection={section} />
    </div>
  );
}

function GuardianAttendance() {
  const [data, setData] = useState<{ students: Array<{ id: string; name: string; summary: AttendanceSummary; history: AttendanceHistoryItem[] }> } | null>(null);
  const [studentId, setStudentId] = useState('');
  useEffect(() => { loadAttendanceGuardian().then((next) => { setData(next); setStudentId(next.students[0]?.id ?? ''); }); }, []);
  const student = useMemo(() => data?.students.find((item) => item.id === studentId), [data, studentId]);
  if (!data) return <LoadingState label="Cargando asistencia..." />;
  return (
    <div className="page-stack attendance-self-page">
      <PageHeader eyebrow="Asistencia" title="Asistencia del estudiante" description="Consulta la asistencia de estudiantes vinculados." />
      <section className="panel attendance-guardian-selector">
        <label>Estudiante vinculado<select value={studentId} onChange={(event) => setStudentId(event.target.value)}>{data.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </section>
      {student ? <AttendanceInsightPanel key={student.id} rows={student.history} ownerName={student.name} /> : <EmptyState title="Sin estudiantes vinculados" description="Cuando exista un estudiante vinculado, su asistencia aparecerá aquí." />}
    </div>
  );
}

function AttendanceInsightPanel({ rows, ownerName, initialSubject = '', initialSection = '' }: { rows: AttendanceHistoryItem[]; ownerName?: string; initialSubject?: string; initialSection?: string }) {
  const [subject, setSubject] = useState(initialSubject);
  const [section, setSection] = useState(initialSection);
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | 'todos'>('todos');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const subjectOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.subject).filter(Boolean))).sort(), [rows]);
  const sectionOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.section).filter(Boolean))).sort(), [rows]);
  const monthOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.date.slice(0, 7)).filter(Boolean))).sort().reverse(), [rows]);
  const rowsForTrend = useMemo(() => rows.filter((row) =>
    (!subject || row.subject === subject) &&
    (!section || row.section === section) &&
    (status === 'todos' || row.status === status)
  ), [rows, section, status, subject]);
  const filteredRows = useMemo(() => rowsForTrend.filter((row) => !month || row.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)), [month, rowsForTrend]);
  const summary = useMemo(() => historySummary(filteredRows), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthlyTrend = useMemo(() => monthOptions.slice(0, 6).reverse().map((item) => {
    const monthRows = rowsForTrend.filter((row) => row.date.startsWith(item));
    return { month: item, ...historySummary(monthRows) };
  }), [monthOptions, rowsForTrend]);
  const hasFilters = Boolean(subject || section || month || status !== 'todos');

  useEffect(() => { setPage(1); }, [month, section, status, subject]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  function clearFilters() {
    setSubject('');
    setSection('');
    setMonth('');
    setStatus('todos');
  }

  return (
    <>
      <section className="attendance-self-summary">
        <article className="primary"><Percent size={20} /><span>Porcentaje general</span><strong>{summary.percentage}%</strong></article>
        <article><CheckCircle2 size={19} /><span>Presentes</span><strong>{summary.presente}</strong></article>
        <article><XCircle size={19} /><span>Ausentes</span><strong>{summary.ausente}</strong></article>
        <article><Clock size={19} /><span>Atrasos</span><strong>{summary.atrasado}</strong></article>
        <article><Users size={19} /><span>Justificados</span><strong>{summary.justificado}</strong></article>
        <article><BookOpen size={19} /><span>Clases registradas</span><strong>{summary.total}</strong></article>
      </section>

      <section className="panel attendance-self-filters">
        <div><span className="eyebrow">{ownerName ? `Estudiante: ${ownerName}` : 'Filtros'}</span><h2>Historial de asistencia</h2></div>
        <label>Asignatura<select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="">Todas las asignaturas</option>{subjectOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Curso/sección<select value={section} onChange={(event) => setSection(event.target.value)}><option value="">Todos los cursos</option>{sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Mes<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Todos los meses</option>{monthOptions.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></label>
        <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as AttendanceStatus | 'todos')}>{historyStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button type="button" className="secondary-button" onClick={clearFilters} disabled={!hasFilters}>Limpiar filtros</button>
      </section>

      <section className="attendance-month-trend">
        {monthlyTrend.map((item) => (
          <article key={item.month}>
            <div><TrendingUp size={17} /><span>{monthLabel(item.month)}</span></div>
            <strong>{item.percentage}%</strong>
            <small>{item.total} clases · {item.ausente} ausencias · {item.atrasado} atrasos</small>
            <em><i style={{ width: `${item.percentage}%` }} /></em>
          </article>
        ))}
        {!monthlyTrend.length && <section className="panel"><EmptyState title="Sin tendencia mensual" description="La tendencia aparecerá cuando existan registros de asistencia." /></section>}
      </section>

      <section className="panel attendance-history-panel">
        {visibleRows.length ? (
          <>
            <div className="attendance-history-grid">
              <div className="attendance-history-row head"><span>Fecha</span><span>Día</span><span>Asignatura</span><span>Curso/sección</span><span>Estado</span><span>Observación</span></div>
              {visibleRows.map((row) => (
                <article key={row.id} className="attendance-history-row">
                  <span>{formatShortDate(row.date)}</span>
                  <span>{dayFromHistoryDate(row.date)}</span>
                  <strong>{row.subject}</strong>
                  <span>{row.section}</span>
                  <span><span className={`attendance-badge ${row.status}`}>{statusLabel(row.status)}</span></span>
                  <small>{row.note || 'Sin observación'}</small>
                </article>
              ))}
            </div>
            <div className="assignment-pager">
              <button className="secondary-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
              <span>Página {currentPage} de {totalPages}</span>
              <button className="secondary-button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
            </div>
          </>
        ) : (
          <EmptyState title="Sin registros para mostrar" description={hasFilters ? 'No hay registros que coincidan con los filtros seleccionados.' : 'Cuando se registre asistencia, verás el historial completo con fechas, estados y observaciones.'} />
        )}
      </section>
    </>
  );
}
