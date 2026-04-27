import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Save, Search, Users, XCircle } from 'lucide-react';
import { loadAttendanceContext, loadAttendanceGuardian, loadAttendanceMe, loadAttendanceRecords, loadAttendanceSummary, saveAttendanceBulk } from '../api';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, LoadingState } from '../components/States';
import type { AttendanceContext, AttendanceHistoryItem, AttendanceRecordsResponse, AttendanceRosterRecord, AttendanceRosterStatus, AttendanceStatus, AttendanceSummary, User } from '../types';

const statusOptions: Array<{ value: AttendanceRosterStatus; label: string }> = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'justificado', label: 'Justificado' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
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

function SummaryCards({ values }: { values: Partial<AttendanceSummary> & { sin_registrar?: number } }) {
  const cards = [
    ['Presentes', values.presente ?? 0, CheckCircle2],
    ['Ausentes', values.ausente ?? 0, XCircle],
    ['Atrasados', values.atrasado ?? 0, Clock],
    ['Justificados', values.justificado ?? 0, Users],
    ['Sin registrar', values.sin_registrar ?? 0, Search]
  ] as const;
  return <section className="attendance-summary-cards">{cards.map(([label, value, Icon]) => <article key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></article>)}</section>;
}

function HistoryTable({ rows }: { rows: AttendanceHistoryItem[] }) {
  if (!rows.length) return <EmptyState title="Sin historial de asistencia" />;
  return (
    <div className="attendance-history-table">
      {rows.map((row) => <article key={row.id}><span>{row.date}</span><strong>{row.subject}</strong><span>{row.section}</span><span className={`attendance-badge ${row.status}`}>{row.status}</span><small>{row.note || '-'}</small></article>)}
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
  const [context, setContext] = useState<AttendanceContext | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<AttendanceRecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState<{ sections: Array<{ name: string; summary: AttendanceSummary }> } | null>(null);
  const futureDate = date > today();
  const section = context?.sections.find((item) => item.id === sectionId);
  const subjects = section?.subjects ?? [];
  const counts = summaryFromRows(records?.students ?? []);

  useEffect(() => {
    Promise.all([loadAttendanceContext(), ['admin', 'director', 'inspector'].includes(user.primaryRole) ? loadAttendanceSummary() : Promise.resolve(null)])
      .then(([nextContext, adminSummary]) => {
        setContext(nextContext);
        setSummary(adminSummary);
        setSectionId(nextContext.sections[0]?.id ?? '');
        setSubjectId(nextContext.sections[0]?.subjects[0]?.id ?? '');
      })
      .finally(() => setLoading(false));
  }, [user.primaryRole]);

  useEffect(() => {
    const nextSection = context?.sections.find((item) => item.id === sectionId);
    setSubjectId(nextSection?.subjects[0]?.id ?? '');
    setRecords(null);
  }, [context, sectionId]);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    if (!sectionId || !subjectId || futureDate) return;
    setRecords(await loadAttendanceRecords({ sectionId, subjectId, date }));
  }

  function updateStudent(studentId: string, patch: Partial<AttendanceRosterRecord>) {
    setRecords((current) => current ? { ...current, students: current.students.map((student) => student.studentId === studentId ? { ...student, ...patch } : student) } : current);
  }

  function markAll(status: AttendanceRosterStatus) {
    setRecords((current) => current ? { ...current, students: current.students.map((student) => ({ ...student, status })) } : current);
  }

  async function save() {
    if (!records || futureDate || !window.confirm('Confirmar guardado de asistencia?')) return;
    setSaving(true);
    await saveAttendanceBulk({ sectionId, subjectId, date, records: records.students.filter((row) => row.status !== 'sin_registrar').map((row) => ({ studentId: row.studentId, status: row.status as AttendanceStatus, note: row.note || undefined })) });
    setNotice('Asistencia guardada correctamente');
    await load();
    setSaving(false);
  }

  if (loading) return <LoadingState label="Cargando asistencia..." />;
  if (!context?.sections.length) return <div className="page-stack"><PageHeader eyebrow="Asistencia" title="Sin secciones asignadas" description="No hay secciones/asignaturas disponibles para registrar asistencia." /></div>;

  return (
    <div className="page-stack attendance-page">
      <PageHeader eyebrow="Asistencia" title="Asistencia" description="Registro diario por seccion, asignatura y estudiante." />
      {notice && <div className="admin-notice success" onClick={() => setNotice('')}>{notice}</div>}
      <SummaryCards values={counts} />
      <form className="panel attendance-filters" onSubmit={load}>
        <label>Seccion<select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>{context.sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Asignatura<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <button className="primary-button" disabled={futureDate || !subjectId}>Cargar asistencia</button>
      </form>
      {futureDate && <div className="alert">No se puede registrar asistencia futura.</div>}
      {records ? (
        <section className="panel attendance-roster">
          <div className="attendance-actions"><button className="secondary-button" onClick={() => markAll('presente')}>Marcar todos presentes</button><button className="secondary-button" onClick={() => markAll('ausente')}>Marcar todos ausentes</button><button className="secondary-button" onClick={() => markAll('sin_registrar')}>Limpiar selección</button><button className="primary-button" onClick={save} disabled={saving || futureDate}><Save size={17} />{saving ? 'Guardando...' : 'Guardar asistencia'}</button></div>
          {records.students.map((student) => <article key={student.studentId} className={student.registered ? 'updated' : ''}><div><strong>{student.name}</strong><small>{student.email}</small></div><div className="segmented">{statusOptions.map((option) => <button key={option.value} type="button" className={student.status === option.value ? 'active' : ''} onClick={() => updateStudent(student.studentId, { status: option.value })}>{option.label}</button>)}</div><input value={student.note} onChange={(event) => updateStudent(student.studentId, { note: event.target.value })} placeholder="Nota opcional" />{student.registered && <span className="attendance-updated">Actualizado</span>}</article>)}
        </section>
      ) : <EmptyState title="Carga una asistencia" description="Selecciona seccion, asignatura y fecha para ver el roster." />}
      {summary && <section className="panel"><h3>Resumen por seccion de hoy</h3><div className="attendance-history-table">{summary.sections.map((item) => <article key={item.name}><strong>{item.name}</strong><span>{item.summary.percentage}% asistencia</span><span>{item.summary.ausente} ausentes</span><span>{item.summary.atrasado} atrasos</span></article>)}</div></section>}
    </div>
  );
}

function StudentAttendance() {
  const [data, setData] = useState<{ summary: AttendanceSummary; history: AttendanceHistoryItem[] } | null>(null);
  useEffect(() => { loadAttendanceMe().then(setData); }, []);
  if (!data) return <LoadingState label="Cargando asistencia..." />;
  return <div className="page-stack"><PageHeader eyebrow="Asistencia" title="Mi asistencia" description="Resumen e historial de tus registros." /><SummaryCards values={data.summary} /><section className="panel"><HistoryTable rows={data.history} /></section></div>;
}

function GuardianAttendance() {
  const [data, setData] = useState<{ students: Array<{ id: string; name: string; summary: AttendanceSummary; history: AttendanceHistoryItem[] }> } | null>(null);
  const [studentId, setStudentId] = useState('');
  useEffect(() => { loadAttendanceGuardian().then((next) => { setData(next); setStudentId(next.students[0]?.id ?? ''); }); }, []);
  const student = useMemo(() => data?.students.find((item) => item.id === studentId), [data, studentId]);
  if (!data) return <LoadingState label="Cargando asistencia..." />;
  return <div className="page-stack"><PageHeader eyebrow="Asistencia" title="Asistencia del estudiante" description="Consulta la asistencia de estudiantes vinculados." /><section className="panel attendance-filters"><label>Estudiante<select value={studentId} onChange={(event) => setStudentId(event.target.value)}>{data.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section>{student ? <><SummaryCards values={student.summary} /><section className="panel"><HistoryTable rows={student.history} /></section></> : <EmptyState title="Sin estudiantes vinculados" />}</div>;
}
