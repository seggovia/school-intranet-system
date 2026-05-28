import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadGradebookEvaluations, loadGradebookRecords, loadMySubjects } from '../api';
import { EmptyState } from '../components/States';
import { PageHeader } from '../components/PageHeader';
import { useAsyncData } from '../hooks';
import type { GradebookEvaluation, GradebookRecord, MySubject } from '../types';

type SubjectSummary = {
  average: number | null;
  risk: number;
};

function formatAverage(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

function summarizeSubject(subject: MySubject, evaluations: GradebookEvaluation[], recordsByEvaluation: Record<string, GradebookRecord[]>): SubjectSummary {
  const studentAverages = subject.students.map((student) => {
    let total = 0;
    let scored = 0;
    evaluations.forEach((evaluation) => {
      const record = recordsByEvaluation[evaluation.id]?.find((item) => item.studentId === student.id);
      if (record?.status === 'con_nota' && record.score !== null) {
        total += Number(record.score) * (evaluation.weight / 100);
        scored += 1;
      }
    });
    return scored ? Number(total.toFixed(1)) : null;
  });
  const valid = studentAverages.filter((value): value is number => value !== null);
  return {
    average: valid.length ? Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1)) : null,
    risk: valid.filter((value) => value < 4).length
  };
}

export function MySubjectsPage() {
  const subjects = useAsyncData(loadMySubjects, [] as MySubject[]);
  const [summaries, setSummaries] = useState<Record<string, SubjectSummary>>({});

  useEffect(() => {
    let active = true;
    async function loadSummaries() {
      const entries = await Promise.all(subjects.data.map(async (subject) => {
        const evaluations = await loadGradebookEvaluations({ sectionId: subject.sectionId, subjectId: subject.id });
        const recordEntries = await Promise.all(evaluations.map(async (evaluation) => [evaluation.id, (await loadGradebookRecords(evaluation.id)).students] as const));
        return [`${subject.sectionId}:${subject.id}`, summarizeSubject(subject, evaluations, Object.fromEntries(recordEntries))] as const;
      }));
      if (active) setSummaries(Object.fromEntries(entries));
    }
    if (subjects.data.length) void loadSummaries();
    else setSummaries({});
    return () => {
      active = false;
    };
  }, [subjects.data]);

  const sortedSubjects = useMemo(() => [...subjects.data].sort((a, b) => `${a.section}-${a.name}`.localeCompare(`${b.section}-${b.name}`)), [subjects.data]);

  return (
    <div className="page-stack my-subjects-page">
      <PageHeader eyebrow="Académico" title="Mis asignaturas" description="Selecciona una asignatura para abrir su libro de calificaciones." />
      {subjects.loading ? (
        <section className="panel"><EmptyState title="Cargando asignaturas" /></section>
      ) : sortedSubjects.length ? (
        <section className="my-subjects-grid">
          {sortedSubjects.map((subject) => {
            const summary = summaries[`${subject.sectionId}:${subject.id}`];
            return (
              <Link key={`${subject.sectionId}:${subject.id}`} className="my-subject-card" to={`/calificaciones?cursoId=${encodeURIComponent(subject.sectionId)}&asignaturaId=${encodeURIComponent(subject.id)}`}>
                <header>
                  <span className="subject-icon"><BookOpen size={20} /></span>
                  {summary?.risk ? <strong className="subject-risk-badge"><AlertTriangle size={14} />{summary.risk} en riesgo</strong> : null}
                </header>
                <h2>{subject.name}</h2>
                <p>{subject.section}</p>
                <div>
                  <span><Users size={15} />{subject.students.length} estudiantes</span>
                  <span>Promedio {formatAverage(summary?.average ?? null)}</span>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', gap: 10, minHeight: 280, padding: 32, textAlign: 'center', color: 'var(--color-muted)' }}>
          <BookOpen size={48} color="var(--color-muted)" />
          <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: 22 }}>Sin asignaturas asignadas</h2>
          <p style={{ margin: 0, maxWidth: 520 }}>No tienes asignaturas activas para este período. Contacta al administrador si crees que esto es un error.</p>
        </div>
      )}
    </div>
  );
}
