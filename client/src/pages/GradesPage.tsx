import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { loadMyGrades, loadMySubjects, saveGrade } from '../api';
import { GradeTable } from '../components/GradeTable';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import type { Grade, MySubject, User } from '../types';

export function GradesPage({ user }: { user: User }) {
  const [subjects, setSubjects] = useState<MySubject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [score, setScore] = useState('6.0');
  const canManage = user.permissions.includes('grades:manage');

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjects, subjectId]);
  const selectedStudent = selectedSubject?.students.find((student) => student.id === studentId);

  useEffect(() => {
    Promise.all([loadMySubjects(), loadMyGrades()]).then(([subjectItems, gradeItems]) => {
      setSubjects(subjectItems);
      setGrades(gradeItems);
      setSubjectId(subjectItems[0]?.id ?? '');
      setStudentId(subjectItems[0]?.students[0]?.id ?? '');
      setAssessmentId(subjectItems[0]?.assessments[0]?.id ?? '');
    });
  }, []);

  useEffect(() => {
    setStudentId(selectedSubject?.students[0]?.id ?? '');
    setAssessmentId(selectedSubject?.assessments[0]?.id ?? '');
  }, [selectedSubject]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudent || !assessmentId) return;
    const grade = await saveGrade({ assessmentId, studentId, enrollmentId: selectedStudent.enrollmentId, score: Number(score) });
    setGrades((current) => [grade, ...current.filter((item) => item.id !== grade.id)]);
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Calificaciones" title={canManage ? 'Ingreso de notas' : 'Mis notas'} description={canManage ? 'Registra o corrige calificaciones de evaluaciones para estudiantes visibles.' : 'Revisa las calificaciones disponibles para tu rol.'} />

      {canManage && (
        <form className="panel toolbar-panel" onSubmit={handleSubmit}>
          <label>
            Asignatura
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {subjects.map((subject) => <option key={`${subject.id}-${subject.sectionId}`} value={subject.id}>{subject.name} · {subject.section}</option>)}
            </select>
          </label>
          <label>
            Estudiante
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {selectedSubject?.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
          <label>
            Evaluacion
            <select value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}>
              {selectedSubject?.assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
            </select>
          </label>
          <label>
            Nota
            <input type="number" min="1" max="7" step="0.1" value={score} onChange={(event) => setScore(event.target.value)} />
          </label>
          <button className="primary-button" type="submit"><Save size={17} /> Guardar nota</button>
        </form>
      )}

      <section className="panel">
        {grades.length ? <GradeTable grades={grades} /> : <EmptyState title="Sin calificaciones disponibles" />}
      </section>
    </div>
  );
}
