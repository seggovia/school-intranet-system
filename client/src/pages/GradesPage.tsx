import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit3, Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteGradebookEvaluation,
  loadGradebookContext,
  loadGradebookEvaluations,
  loadGradebookGuardian,
  loadGradebookMe,
  loadGradebookRecords,
  loadGradebookSummary,
  loadSectionStudents,
  saveGradebookRecords
} from '../api';
import { EvaluationModal } from '../components/EvaluationModal';
import { GradebookTable } from '../components/GradebookTable';
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
  GradebookTableRow,
  GuardianGradebookResponse,
  MyGradebookResponse,
  SectionStudent,
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
  control: 'Control',
  proyecto: 'Proyecto',
  participacion: 'Participación'
};

const gradeStatuses = Object.keys(statusLabels) as GradeStatus[];

function formatAverage(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

function periodKey(date: string) {
  return date.slice(0, 7);
}

function periodLabel(value: string) {
  if (!value) return 'Todos';
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

function buildGradebookRows(students: SectionStudent[], evaluations: GradebookEvaluation[], recordsByEvaluation: Record<string, GradebookRecord[]>): GradebookTableRow[] {
  const recordMaps = Object.fromEntries(
    Object.entries(recordsByEvaluation).map(([evaluationId, records]) => [evaluationId, new Map(records.map((record) => [record.studentId, record]))])
  );

  return students.map((student) => {
    const scores: GradebookTableRow['scores'] = {};
    let weightedTotal = 0;
    const averageParts: string[] = [];

    evaluations.forEach((evaluation) => {
      const record = recordMaps[evaluation.id]?.get(student.id);
      if (!record) return;
      scores[evaluation.id] = {
        evaluationId: evaluation.id,
        score: record.score,
        status: record.status,
        registered: record.registered
      };
      if (record.status === 'con_nota' && record.score !== null) {
        const contribution = Number(record.score) * (evaluation.weight / 100);
        weightedTotal += contribution;
        averageParts.push(`${evaluation.title}: ${Number(record.score).toFixed(1)} x ${evaluation.weight}% = ${contribution.toFixed(2)}`);
      }
    });

    const finalAverage = averageParts.length ? Number(weightedTotal.toFixed(1)) : null;
    const academicRisk = finalAverage !== null && finalAverage < 4;
    return {
      id: student.id,
      studentId: student.id,
      student: student.name,
      email: undefined,
      scores,
      finalAverage,
      averageDetail: averageParts.length ? averageParts.join('\n') : 'Sin notas registradas para calcular promedio',
      academicRisk
    };
  });
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

function StaffGradebookView({ user }: { user: User }) {
  const canWrite = ['admin', 'director', 'teacher'].includes(user.primaryRole);
  const [context, setContext] = useState<GradebookContext | null>(null);
  const [evaluations, setEvaluations] = useState<GradebookEvaluation[]>([]);
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [recordsByEvaluation, setRecordsByEvaluation] = useState<Record<string, GradebookRecord[]>>({});
  const [records, setRecords] = useState<GradebookRecord[]>([]);
  const [summary, setSummary] = useState<GradebookAdminSummary | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
  const [modalEvaluation, setModalEvaluation] = useState<GradebookEvaluation | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [riskOnly, setRiskOnly] = useState(false);
  const [loadingGradebook, setLoadingGradebook] = useState(false);
  const section = context?.sections.find((item) => item.id === sectionId);
  const periodOptions = useMemo(() => Array.from(new Set(evaluations.map((item) => periodKey(item.date)))).sort().reverse(), [evaluations]);
  const filteredEvaluations = useMemo(() => evaluations.filter((item) => !period || periodKey(item.date) === period), [evaluations, period]);
  const evaluation = filteredEvaluations.find((item) => item.id === evaluationId);
  const gradebookRows = useMemo(() => buildGradebookRows(students, filteredEvaluations, recordsByEvaluation), [filteredEvaluations, recordsByEvaluation, students]);
  const riskCount = useMemo(() => gradebookRows.filter((row) => row.academicRisk).length, [gradebookRows]);
  const visibleGradebookRows = useMemo(() => riskOnly ? gradebookRows.filter((row) => row.academicRisk) : gradebookRows, [gradebookRows, riskOnly]);
  const courseAverage = useMemo(() => {
    const averages = visibleGradebookRows.map((row) => row.finalAverage).filter((value): value is number => value !== null);
    return averages.length ? Number((averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1)) : null;
  }, [visibleGradebookRows]);

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
    let active = true;
    setLoadingGradebook(true);
    setError('');
    Promise.all([loadSectionStudents(sectionId), loadGradebookEvaluations({ sectionId, subjectId })]).then(async ([sectionStudents, items]) => {
      const recordEntries = await Promise.all(items.map(async (item) => [item.id, (await loadGradebookRecords(item.id)).students] as const));
      if (!active) return;
      const nextRecordsByEvaluation = Object.fromEntries(recordEntries);
      setStudents(sectionStudents);
      setEvaluations(items);
      setRecordsByEvaluation(nextRecordsByEvaluation);
      setDirtyCells(new Set());
      setCellErrors({});
      setCellDrafts({});
      setEvaluationId(items[0]?.id ?? '');
      setRecords(items[0] ? nextRecordsByEvaluation[items[0].id] ?? [] : []);
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar el libro de notas.');
    }).finally(() => {
      if (active) setLoadingGradebook(false);
    });
    return () => {
      active = false;
    };
  }, [sectionId, subjectId]);

  useEffect(() => {
    if (!filteredEvaluations.some((item) => item.id === evaluationId)) {
      setEvaluationId(filteredEvaluations[0]?.id ?? '');
    }
  }, [evaluationId, filteredEvaluations]);

  useEffect(() => {
    setRecords(evaluationId ? recordsByEvaluation[evaluationId] ?? [] : []);
  }, [evaluationId, recordsByEvaluation]);

  async function saveRecords() {
    if (!evaluationId) return;
    setSaving(true);
    setError('');
    try {
      await saveGradebookRecords({
        evaluationId,
        records: records.map((record) => ({ studentId: record.studentId, status: record.status, score: record.status === 'con_nota' ? record.score : null, comment: record.comment || null }))
      });
      const result = await loadGradebookRecords(evaluationId);
      setRecords(result.students);
      setRecordsByEvaluation((current) => ({ ...current, [evaluationId]: result.students }));
      setDirtyCells((current) => {
        const next = new Set(current);
        records.forEach((record) => next.delete(`${evaluationId}:${record.studentId}`));
        return next;
      });
      setCellDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${evaluationId}:`))));
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
    setRecordsByEvaluation((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setDirtyCells((current) => new Set(Array.from(current).filter((key) => !key.startsWith(`${item.id}:`))));
    setCellErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${item.id}:`))));
    setCellDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${item.id}:`))));
    setRecords([]);
  }

  async function reloadEvaluations() {
    const items = await loadGradebookEvaluations({ sectionId, subjectId });
    const recordEntries = await Promise.all(items.map(async (item) => [item.id, (await loadGradebookRecords(item.id)).students] as const));
    setEvaluations(items);
    setRecordsByEvaluation(Object.fromEntries(recordEntries));
    setDirtyCells(new Set());
    setCellErrors({});
    setCellDrafts({});
    setEvaluationId(items[0]?.id ?? '');
  }

  function updateGradebookScore(evaluationItem: GradebookEvaluation, row: GradebookTableRow, value: string) {
    const key = `${evaluationItem.id}:${row.studentId}`;
    const trimmed = value.trim();
    const parsedScore = Number(trimmed);
    const score = trimmed ? parsedScore : null;
    const hasError = trimmed !== '' && (!Number.isFinite(parsedScore) || parsedScore < 1 || parsedScore > 7);

    setCellDrafts((current) => ({ ...current, [key]: value }));
    setCellErrors((current) => {
      const next = { ...current };
      if (hasError) next[key] = '1.0 a 7.0';
      else delete next[key];
      return next;
    });
    setDirtyCells((current) => new Set(current).add(key));
    setRecordsByEvaluation((current) => {
      const existingRecords = current[evaluationItem.id] ?? [];
      const existing = existingRecords.find((record) => record.studentId === row.studentId);
      const nextRecord: GradebookRecord = {
        studentId: row.studentId,
        enrollmentId: existing?.enrollmentId ?? '',
        name: existing?.name ?? row.student,
        email: existing?.email ?? '',
        score: hasError ? existing?.score ?? null : score,
        status: trimmed && !hasError ? 'con_nota' : 'pendiente',
        comment: existing?.comment ?? '',
        registered: existing?.registered ?? false,
        updatedAt: existing?.updatedAt ?? null
      };
      const nextRecords = existing
        ? existingRecords.map((record) => record.studentId === row.studentId ? nextRecord : record)
        : [...existingRecords, nextRecord];
      return { ...current, [evaluationItem.id]: nextRecords };
    });
  }

  async function saveGradebookChanges() {
    if (!dirtyCells.size) return;
    if (Object.keys(cellErrors).length) {
      setError('Corrige las notas fuera de rango antes de guardar.');
      return;
    }

    setSavingBulk(true);
    setError('');
    try {
      const evaluationIds = Array.from(new Set(Array.from(dirtyCells).map((key) => key.split(':')[0])));
      await Promise.all(evaluationIds.map((id) => saveGradebookRecords({
        evaluationId: id,
        records: (recordsByEvaluation[id] ?? []).map((record) => ({
          studentId: record.studentId,
          status: record.status,
          score: record.status === 'con_nota' ? record.score : null,
          comment: record.comment || null
        }))
      })));
      const refreshed = await Promise.all(evaluationIds.map(async (id) => [id, (await loadGradebookRecords(id)).students] as const));
      setRecordsByEvaluation((current) => ({ ...current, ...Object.fromEntries(refreshed) }));
      setDirtyCells(new Set());
      setCellErrors({});
      setCellDrafts({});
      setNotice('Cambios guardados correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSavingBulk(false);
    }
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
        <label>Curso
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            {context.sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Asignatura
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {section?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Período
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">Todos</option>
            {periodOptions.map((item) => <option key={item} value={item}>{periodLabel(item)}</option>)}
          </select>
        </label>
        <label>Evaluación
          <select value={evaluationId} onChange={(event) => setEvaluationId(event.target.value)}>
            <option value="">Selecciona evaluación</option>
            {filteredEvaluations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.date}</option>)}
          </select>
        </label>
        {canWrite && <button className="primary-button" onClick={() => setModalEvaluation(null)}><Plus size={17} />Nueva evaluación</button>}
      </section>

      <section className="panel">
        <div className="gradebook-table-heading">
          <div>
            <h2>Libro de notas</h2>
            <span className={`gradebook-course-average ${courseAverage === null ? 'muted' : courseAverage >= 4 ? 'passing' : 'failing'}`}>Promedio general del curso: {formatAverage(courseAverage)}</span>
            <span className="gradebook-risk-count">Estudiantes en riesgo: {riskCount}</span>
          </div>
          <label className="gradebook-risk-filter">
            <input type="checkbox" checked={riskOnly} onChange={(event) => setRiskOnly(event.target.checked)} />
            Mostrar solo estudiantes en riesgo
          </label>
          {canWrite && (
            <button className="primary-button" onClick={saveGradebookChanges} disabled={!dirtyCells.size || savingBulk || Boolean(Object.keys(cellErrors).length)}>
              <Save size={17} />{savingBulk ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
        {loadingGradebook ? (
          <EmptyState title="Cargando libro de notas" />
        ) : !students.length ? (
          <EmptyState title="No hay estudiantes registrados para este curso" />
        ) : !filteredEvaluations.length ? (
          <EmptyState title="No hay evaluaciones registradas para esta asignatura" />
        ) : (
          <GradebookTable
            evaluations={filteredEvaluations}
            rows={visibleGradebookRows}
            onEditEvaluation={canWrite ? (item) => setModalEvaluation(item) : undefined}
            onDeleteEvaluation={canWrite ? removeEvaluation : undefined}
            editable={canWrite}
            dirtyCells={dirtyCells}
            cellErrors={cellErrors}
            cellDrafts={cellDrafts}
            onScoreChange={updateGradebookScore}
          />
        )}
      </section>

      {evaluation && (
        <section className="panel gradebook-evaluation-card">
          <div><strong>{evaluation.title}</strong><small>{evaluation.subject} · {evaluation.section} · {typeLabels[evaluation.type]} · {evaluation.weight}%</small></div>
          {canWrite && <div><button className="secondary-button" onClick={() => setModalEvaluation(evaluation)}><Edit3 size={16} />Editar</button><button className="danger-button" onClick={() => removeEvaluation(evaluation)}><Trash2 size={16} />Eliminar</button></div>}
        </section>
      )}

      <section className="panel">
        <h2>Registro de evaluación</h2>
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
        ) : <EmptyState title={filteredEvaluations.length ? 'Selecciona una evaluación con estudiantes para registrar notas' : 'No hay evaluaciones registradas para esta asignatura'} />}
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

      {modalEvaluation !== undefined && <EvaluationModal evaluation={modalEvaluation ?? undefined} sectionId={sectionId} subjectId={subjectId} onClose={() => setModalEvaluation(undefined)} onSaved={async () => {
        setModalEvaluation(undefined);
        setNotice('Evaluación guardada correctamente');
        await reloadEvaluations();
      }} />}
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
