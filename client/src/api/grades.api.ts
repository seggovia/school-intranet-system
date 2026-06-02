import { api } from '../api';
import type {
  Assessment,
  Grade,
  GradebookAdminSummary,
  GradebookContext,
  GradebookEvaluation,
  GradebookRecordsResponse,
  GradeStatus,
  GuardianGradebookResponse,
  MyGradebookResponse
} from '../types';

export async function loadMyGrades() {
  const { data } = await api.get<Grade[]>('/me/grades');
  return data;
}

export async function loadAssessments() {
  const { data } = await api.get<Assessment[]>('/assessments');
  return data;
}

export async function loadGrades() {
  const { data } = await api.get<Grade[]>('/grades');
  return data;
}

export async function saveGrade(input: { assessmentId: string; studentId: string; enrollmentId: string; score: number }) {
  const { data } = await api.post<Grade>('/grades', input);
  return data;
}

export type GradebookEvaluationPayload = {
  title: string;
  subjectId: string;
  sectionId: string;
  date: string;
  weight: number;
  type: string;
  description?: string;
};

export async function loadGradebookContext() {
  const { data } = await api.get<GradebookContext>('/gradebook/context');
  return data;
}

export async function loadGradebookEvaluations(input: { sectionId?: string; subjectId?: string }) {
  const { data } = await api.get<GradebookEvaluation[]>('/gradebook/evaluations', { params: input });
  return data;
}

export async function createGradebookEvaluation(input: GradebookEvaluationPayload) {
  const { data } = await api.post<GradebookEvaluation>('/gradebook/evaluations', input);
  return data;
}

export async function updateGradebookEvaluation(id: string, input: Partial<GradebookEvaluationPayload>) {
  const { data } = await api.patch<GradebookEvaluation>(`/gradebook/evaluations/${id}`, input);
  return data;
}

export async function deleteGradebookEvaluation(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/gradebook/evaluations/${id}`);
  return data;
}

export async function loadGradebookRecords(evaluationId: string) {
  const { data } = await api.get<GradebookRecordsResponse>('/gradebook/records', { params: { evaluationId } });
  return data;
}

export async function saveGradebookRecords(input: { evaluationId: string; records: Array<{ studentId: string; status: GradeStatus; score?: number | null; comment?: string | null }> }) {
  const { data } = await api.post<{ ok: true; records: number }>('/gradebook/records/bulk', input);
  return data;
}

export async function loadGradebookMe() {
  const { data } = await api.get<MyGradebookResponse>('/gradebook/me');
  return data;
}

export async function loadGradebookGuardian() {
  const { data } = await api.get<GuardianGradebookResponse>('/gradebook/guardian');
  return data;
}

export async function loadGradebookSummary() {
  const { data } = await api.get<GradebookAdminSummary>('/gradebook/summary');
  return data;
}
