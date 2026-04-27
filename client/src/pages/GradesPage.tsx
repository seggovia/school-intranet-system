import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Edit3, Plus, Save, Trash2 } from 'lucide-react';
import {
  createGradebookEvaluation,
  deleteGradebookEvaluation,
  loadGradebookContext,
  loadGradebookEvaluations,
  loadGradebookGuardian,
  loadGradebookMe,
  loadGradebookRecords,
  loadGradebookSummary,
  saveGradebookRecords,
  updateGradebookEvaluation,
  type GradebookEvaluationPayload
} from '../api';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import type {
  EvaluationType,
  GradeStatus,
  GradebookAdminSummary,
  GradebookContext,
  GradebookEvaluation,
  GradebookHistoryItem,
  GradebookRecord,
  GuardianGradebookResponse,
  MyGradebookResponse,
  User
} from '../types';

const statusLabels: Record<GradeStatus, string> = {
  con_nota: 'Con nota',
  pendiente: 'Pendiente',
  ausente: 'Ausente',
  eximido: 'Eximido'
};

const typeLabels: Record<EvaluationType, string> = {
  prueba: 'Prueba',
  trabajo: 'Trabajo',
  tarea: 'Tarea',
  proyecto: 'Proyecto',
  participacion: 'Participación'
};

const evaluationTypes = Object.keys(typeLabels) as EvaluationType[];
const gradeStatuses = Object.keys(statusLabels) as GradeStatus[];

function formatAverage(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

function SummaryCards({ summary }: { summary: MyGradebookResponse['summary'] }) {
  return (
    <div className="attendance-summary-grid">
      <article><span>Promedio general</span><strong>{formatAverage(summary.average)}</strong></article>
      <article><span>Notas registradas</span><strong>{summary.scored}</strong></article>
      <article><span>Pendientes</span><strong>{summary.pending}</strong></article>
      <article><span>Ausentes</span><strong>{summary.absent}</strong></article>
      <article><span>Eximidos</span><strong>{summary.exempt}</strong></article>
    </div>
  );
}

function HistoryTable({ history }: { history: GradebookHistoryItem[] }) {
  if (!history.length) return <EmptyState title="Sin calificaciones disponibles" />;
  return (
    <div className="gradebook-history">
      {history.map((item) => (
        <article key={item.id} className="gradebook-history-row">
          <div>
            <strong>{item.evaluation}</strong>
            <small>{item.subject} · {item.section} · {item.date}</small>
            {item.comment && <small>{item.comment}</small>}
          </div>
          <span className={`grade-status ${item.status}`}>{statusLabels[item.status]}</span>
          <strong>{item.score ?? '-'}</strong>
        </article>
      ))}
    </div>
  );
}

function StudentGradebookView({ mode }: { mode: 'student' | 'guardian' }) {
  const [data, setData] = useState<MyGradebookResponse | GuardianGradebookResponse | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    (mode === 'student' ? loadGradebookMe() : loadGradebookGuardian()).then((result) => {
      setData(result);
      if ('students' in result) setSelectedStudent(result.students[0]?.id ?? '');
    });
  }, [mode]);

  if (!data) return <section className="panel"><EmptyState title="Cargando calificaciones" /></section>;
  const current = 'students' in data ? data.students.find((student) => student.id === selectedStudent) ?? data.students[0] : data;

  return (
    <div className="page-stack">
      {'students' in data && (
        <section className="panel toolbar-panel">
          <label>Estudiante
            <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)}>
              {data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
        </section>
      )}
      {current ? (
        <>
          <SummaryCards summary={current.summary} />
          <section className="panel">
            <h2>Promedio por asignatura</h2>
            <div className="gradebook-subject-grid">
              {current.summary.subjects.map((subject) => (
                <article key={subject.subjectId}>
                  <span>{subject.subject}</span>
                  <strong>{formatAverage(subject.average)}</strong>
                  <small>{subject.grades} notas</small>
                </article>
              ))}
            </div>
          </section>
          <section className="panel"><HistoryTable history={current.history} /></section>
        </>
      ) : <section className="panel"><EmptyState title="Sin estudiantes vinculados" /></section>}
    </div>
  );
}

function EvaluationModal({ context, evaluation, sectionId, subjectId, onClose, onSaved }: { context: GradebookContext; evaluation?: GradebookEvaluation; sectionId: string; subjectId: string; onClose: () => void; onSaved: () => void }) {
  const [selectedSection, setSelectedSection] = useState(evaluation?.sectionId ?? sectionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const section = context.sections.find((item) => item.id === selectedSection);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(event.currentTarget);
    const payload: GradebookEvaluationPayload = {
      title: String(fd.get('title') ?? '').trim(),
      sectionId: selectedSection,
      subjectId: String(fd.get('subjectId') ?? ''),
      date: String(fd.get('date') ?? ''),
      weight: Number(fd.get('weight') ?? 1),
      type: String(fd.get('type') ?? 'prueba'),
      description: String(fd.get('description') ?? '').trim() || undefined
    };
    try {
      if (evaluation) await updateGradebookEvaluation(evaluation.id, payload);
      else await createGradebookEvaluation(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal gradebook-evaluation-modal" onSubmit={submit}>
        <header>
          <div><span>Calificaciones</span><h2>{evaluation ? 'Editar evaluación' : 'Crear evaluación'}</h2></div>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <div className="admin-form-grid">
          <label>Título<input name="title" defaultValue={evaluation?.title} required placeholder="Ej: Prueba unidad 1" /></label>
          <label>Fecha<input name="date" type="date" defaultValue={evaluation?.date ?? new Date().toISOString().slice(0, 10)} required /></label>
          <label>Sección
            <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)} required>
              {context.sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Asignatura
            <select name="subjectId" defaultValue={evaluation?.subjectId ?? subjectId} required>
              {section?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Tipo
            <select name="type" defaultValue={evaluation?.type ?? 'prueba'}>
              {evaluationTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
            </select>
          </label>
          <label>Ponderación / coeficiente<input name="weight" type="number" min="0.1" max="10" step="0.1" defaultValue={evaluation?.weight ?? 1} required /></label>
          <label className="admin-form-wide">Descripción<textarea name="description" defaultValue={evaluation?.description ?? ''} placeholder="Opcional" /></label>
        </div>
        {error && <p className="admin-modal-error">{error}</p>}
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar evaluación'}</button></footer>
      </form>
    </div>
  );
}

function StaffGradebookView({ user }: { user: User }) {
  const canWrite = ['admin', 'director', 'teacher'].includes(user.primaryRole);
  const [context, setContext] = useState<GradebookContext | null>(null);
  const [evaluations, setEvaluations] = useState<GradebookEvaluation[]>([]);
  const [records, setRecords] = useState<GradebookRecord[]>([]);
  const [summary, setSummary] = useState<GradebookAdminSummary | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
  const [modalEvaluation, setModalEvaluation] = useState<GradebookEvaluation | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const section = context?.sections.find((item) => item.id === sectionId);
  const evaluation = evaluations.find((item) => item.id === evaluationId);

  useEffect(() => {
    loadGradebookContext().then((result) => {
      setContext(result);
      setSectionId(result.sections[0]?.id ?? '');
      setSubjectId(result.sections[0]?.subjects[0]?.id ?? '');
    });
    if (['admin', 'director', 'inspector'].includes(user.primaryRole)) loadGradebookSummary().then(setSummary);
  }, [user.primaryRole]);

  useEffect(() => {
    if (!sectionId) return;
    const nextSubject = context?.sections.find((item) => item.id === sectionId)?.subjects[0]?.id ?? '';
    setSubjectId((current) => section?.subjects.some((subject) => subject.id === current) ? current : nextSubject);
  }, [context, section?.subjects, sectionId]);

  useEffect(() => {
    if (!sectionId || !subjectId) return;
    loadGradebookEvaluations({ sectionId, subjectId }).then((items) => {
      setEvaluations(items);
      setEvaluationId(items[0]?.id ?? '');
      setRecords([]);
    });
  }, [sectionId, subjectId]);

  async function loadRecords(id = evaluationId) {
    if (!id) return;
    const result = await loadGradebookRecords(id);
    setRecords(result.students);
  }

  async function saveRecords() {
    if (!evaluationId) return;
    setSaving(true);
    setError('');
    try {
      await saveGradebookRecords({
        evaluationId,
        records: records.map((record) => ({ studentId: record.studentId, status: record.status, score: record.status === 'con_nota' ? record.score : null, comment: record.comment || null }))
      });
      await loadRecords();
      setNotice('Notas guardadas correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las notas.');
    } finally {
      setSaving(false);
    }
  }

  async function removeEvaluation(item: GradebookEvaluation) {
    if (!confirm(`Eliminar evaluación "${item.title}"? Solo se permite si no tiene notas.`)) return;
    await deleteGradebookEvaluation(item.id);
    setNotice('Evaluación eliminada correctamente');
    const items = await loadGradebookEvaluations({ sectionId, subjectId });
    setEvaluations(items);
    setEvaluationId(items[0]?.id ?? '');
    setRecords([]);
  }

  const counts = useMemo(() => ({
    total: records.length,
    scored: records.filter((item) => item.status === 'con_nota' && item.score !== null).length,
    pending: records.filter((item) => item.status === 'pendiente').length,
    absent: records.filter((item) => item.status === 'ausente').length,
    exempt: records.filter((item) => item.status === 'eximido').length,
    average: (() => {
      const scored = records.filter((item) => item.status === 'con_nota' && item.score !== null);
      return scored.length ? Number((scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length).toFixed(1)) : null;
    })()
  }), [records]);

  if (!context) return <section className="panel"><EmptyState title="Cargando libro de calificaciones" /></section>;
  if (!context.sections.length) {
    return (
      <section className="panel">
        <EmptyState
          title="Sin secciones asignadas"
          description="Asigna al profesor una sección y una asignatura desde Administración > Asignaciones para habilitar asistencia y calificaciones."
        />
      </section>
    );
  }

  return (
    <div className="page-stack">
      {notice && <div className="admin-notice success" onClick={() => setNotice('')}>{notice}</div>}
      {error && <div className="admin-notice error" onClick={() => setError('')}>{error}</div>}
      <div className="attendance-summary-grid">
        <article><span>Promedio</span><strong>{formatAverage(counts.average)}</strong></article>
        <article><span>Con nota</span><strong>{counts.scored}</strong></article>
        <article><span>Pendientes</span><strong>{counts.pending}</strong></article>
        <article><span>Ausentes</span><strong>{counts.absent}</strong></article>
        <article><span>Eximidos</span><strong>{counts.exempt}</strong></article>
      </div>

      <section className="panel gradebook-toolbar">
        <label>Sección
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            {context.sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Asignatura
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {section?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Evaluación
          <select value={evaluationId} onChange={(event) => setEvaluationId(event.target.value)}>
            <option value="">Selecciona evaluación</option>
            {evaluations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.date}</option>)}
          </select>
        </label>
        <button className="secondary-button" onClick={() => loadRecords()} disabled={!evaluationId}><ClipboardList size={17} />Cargar notas</button>
        {canWrite && <button className="primary-button" onClick={() => setModalEvaluation(null)}><Plus size={17} />Nueva evaluación</button>}
      </section>

      {evaluation && (
        <section className="panel gradebook-evaluation-card">
          <div><strong>{evaluation.title}</strong><small>{evaluation.subject} · {evaluation.section} · {typeLabels[evaluation.type]} · coef. {evaluation.weight}</small></div>
          {canWrite && <div><button className="secondary-button" onClick={() => setModalEvaluation(evaluation)}><Edit3 size={16} />Editar</button><button className="danger-button" onClick={() => removeEvaluation(evaluation)}><Trash2 size={16} />Eliminar</button></div>}
        </section>
      )}

      <section className="panel">
        {records.length ? (
          <>
            <div className="gradebook-record-list">
              {records.map((record) => (
                <article key={record.studentId} className="gradebook-record-row">
                  <div><strong>{record.name}</strong><small>{record.email}</small></div>
                  <select value={record.status} disabled={!canWrite} onChange={(event) => setRecords((current) => current.map((item) => item.studentId === record.studentId ? { ...item, status: event.target.value as GradeStatus, score: event.target.value === 'con_nota' ? item.score : null } : item))}>
                    {gradeStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                  </select>
                  <input type="number" min="1" max="7" step="0.1" value={record.score ?? ''} disabled={!canWrite || record.status !== 'con_nota'} onChange={(event) => setRecords((current) => current.map((item) => item.studentId === record.studentId ? { ...item, score: event.target.value ? Number(event.target.value) : null } : item))} placeholder="1.0 a 7.0" />
                  <input value={record.comment} disabled={!canWrite} onChange={(event) => setRecords((current) => current.map((item) => item.studentId === record.studentId ? { ...item, comment: event.target.value } : item))} placeholder="Comentario opcional" />
                </article>
              ))}
            </div>
            {canWrite && <footer className="gradebook-actions"><button className="primary-button" onClick={saveRecords} disabled={saving}><Save size={17} />{saving ? 'Guardando...' : 'Guardar notas'}</button></footer>}
          </>
        ) : <EmptyState title={evaluations.length ? 'Carga una evaluación para registrar notas' : 'No hay evaluaciones para estos filtros'} />}
      </section>

      {summary && (
        <section className="panel">
          <h2>Resumen por sección</h2>
          <div className="gradebook-summary-grid">
            {summary.sections.map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <span>Promedio {formatAverage(item.average)}</span>
                <small>{item.belowAverage} estudiantes bajo 4.0</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {modalEvaluation !== undefined && <EvaluationModal context={context} evaluation={modalEvaluation ?? undefined} sectionId={sectionId} subjectId={subjectId} onClose={() => setModalEvaluation(undefined)} onSaved={async () => { setModalEvaluation(undefined); setNotice('Evaluación guardada correctamente'); setEvaluations(await loadGradebookEvaluations({ sectionId, subjectId })); }} />}
    </div>
  );
}

export function GradesPage({ user }: { user: User }) {
  const readOnly = user.primaryRole === 'inspector';
  return (
    <div className="page-stack gradebook-page">
      <PageHeader eyebrow="Calificaciones" title="Libro de calificaciones" description={readOnly ? 'Revisa evaluaciones, promedios y estudiantes bajo promedio.' : 'Gestiona evaluaciones, registra notas y revisa promedios por rol.'} />
      {user.primaryRole === 'student' && <StudentGradebookView mode="student" />}
      {user.primaryRole === 'guardian' && <StudentGradebookView mode="guardian" />}
      {['admin', 'director', 'teacher', 'inspector'].includes(user.primaryRole) && <StaffGradebookView user={user} />}
      {!['admin', 'director', 'teacher', 'inspector', 'student', 'guardian'].includes(user.primaryRole) && <section className="panel"><AlertTriangle /><EmptyState title="Sin acceso al libro de calificaciones" /></section>}
    </div>
  );
}
