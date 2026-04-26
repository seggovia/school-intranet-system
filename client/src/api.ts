import axios from 'axios';
import type { Announcement, Assessment, AssignmentSubmissionReviewRow, AttendanceRecord, AuthSession, CalendarEvent, Course, DashboardData, DocumentItem, Grade, MySubject, RequestTicket, RoleDashboard, ScheduleCalendarEvent, SectionStudent, Student, Subject, SubjectDetailData, UserProfileData } from './types';

export const sessionStorageKey = 'school-intranet-session';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 8000
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(sessionStorageKey);
  if (raw) {
    const session = JSON.parse(raw) as AuthSession;
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const raw = localStorage.getItem(sessionStorageKey);
    if (error.response?.status === 401 && raw && !original._retry) {
      original._retry = true;
      const current = JSON.parse(raw) as AuthSession;
      const { data } = await axios.post<AuthSession>('/api/auth/refresh', { refreshToken: current.refreshToken });
      const nextSession = { ...current, ...data };
      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      original.headers.Authorization = `Bearer ${nextSession.accessToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

type LegacySubjectDetail = Partial<SubjectDetailData> & {
  id?: string;
  name?: string;
  code?: string;
  sections?: Array<{
    id: string;
    name: string;
    teacher?: string;
    classroom?: string;
    students?: SectionStudent[];
    schedules?: Array<{
      id: string;
      weekday: number;
      startsAt: string;
      endsAt: string;
      subject?: string;
      teacher?: string;
      classroom?: string;
    }>;
  }>;
  units?: Array<{ id: string; title: string; description?: string; topics?: string[]; contents?: SubjectDetailData['units'][number]['contents']; assignments?: SubjectDetailData['units'][number]['assignments'] }>;
};

function normalizeSubjectDetail(input: SubjectDetailData | LegacySubjectDetail): SubjectDetailData {
  const legacy = input as LegacySubjectDetail;
  const firstSection = input.sections?.[0];
  const firstSchedule = firstSection?.schedules?.[0];
  const subject = input.subject ?? {
    id: legacy.id ?? '',
    name: legacy.name ?? '',
    code: legacy.code ?? ''
  };

  return {
    subject,
    teacher: input.teacher ?? firstSchedule?.teacher ?? firstSection?.teacher ?? 'Sin asignar',
    section: input.section ?? firstSection?.name ?? 'Sin seccion',
    room: input.room ?? firstSchedule?.classroom ?? firstSection?.classroom ?? 'Sin sala',
    schedule: input.schedule ?? input.sections?.flatMap((section) => section.schedules?.map((schedule) => ({
      id: schedule.id,
      weekday: schedule.weekday,
      weekdayName: weekdayNames[schedule.weekday] ?? `Dia ${schedule.weekday}`,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      subjectId: subject.id,
      subject: schedule.subject ?? subject.name,
      teacher: schedule.teacher ?? firstSection?.teacher ?? 'Sin asignar',
      classroom: schedule.classroom ?? section.classroom ?? 'Sin sala',
      section: section.name
    })) ?? []) ?? [],
    units: input.units?.map((unit, index) => {
      const topics = (unit as { topics?: string[] }).topics;
      return {
        id: unit.id,
        title: unit.title || `Unidad ${index + 1}`,
        description: unit.description ?? (Array.isArray(topics) ? topics.join(', ') : undefined) ?? `Contenidos de ${subject.name}`,
        contents: unit.contents ?? [
          { id: `${unit.id}-presentacion`, type: 'presentacion', title: `Presentacion ${unit.title}`, status: 'disponible' },
          { id: `${unit.id}-guia`, type: 'guia', title: `Guia ${index + 1}`, status: 'disponible' }
        ],
        assignments: unit.assignments ?? []
      };
    }) ?? [],
    materials: input.materials ?? [],
    assessments: input.assessments ?? [],
    sections: input.sections?.map((section) => ({
      id: section.id,
      name: section.name,
      teacher: section.teacher ?? 'Sin asignar',
      classroom: section.classroom ?? 'Sin sala',
      students: section.students ?? [],
      schedules: section.schedules ?? []
    })) ?? []
  };
}

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthSession>('/auth/login', { email, password });
  return data;
}

export async function logout(refreshToken: string) {
  const { data } = await api.post<{ ok: true }>('/auth/logout', { refreshToken });
  return data;
}

export async function loadDashboard() {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}

export async function loadMyDashboard() {
  const { data } = await api.get<RoleDashboard>('/me/dashboard');
  return data;
}

export async function loadMySubjects() {
  const { data } = await api.get<MySubject[]>('/me/subjects');
  return data;
}

export async function loadSubjectDetail(id: string) {
  const { data } = await api.get<SubjectDetailData>(`/subjects/${id}/detail`);
  return normalizeSubjectDetail(data);
}

export async function createSubjectUnit(subjectId: string, input: { title: string; description: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
  const { data } = await api.post(`/subjects/${subjectId}/units`, input);
  return data;
}

export async function updateSubjectUnit(unitId: string, input: { title?: string; description?: string; duration?: string; outcomes?: string[]; bibliography?: string[]; order?: number }) {
  const { data } = await api.patch(`/subjects/units/${unitId}`, input);
  return data;
}

export async function deleteSubjectUnit(unitId: string) {
  const { data } = await api.delete<{ ok: true }>(`/subjects/units/${unitId}`);
  return data;
}

export async function createUnitMaterial(unitId: string, input: { title: string; type: string; fileUrl?: string }) {
  const { data } = await api.post(`/subjects/units/${unitId}/materials`, input);
  return data;
}

export async function uploadUnitMaterial(unitId: string, input: { title: string; type: string; file: File }) {
  const form = new FormData();
  form.append('title', input.title);
  form.append('type', input.type);
  form.append('file', input.file);
  const { data } = await api.post(`/subjects/units/${unitId}/materials/upload`, form);
  return data;
}

export async function downloadUnitMaterial(materialId: string) {
  const response = await api.get<Blob>(`/materials/${materialId}/download`, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return { blob: response.data, filename: match?.[1] };
}

export async function deleteUnitMaterial(materialId: string) {
  const { data } = await api.delete<{ ok: true }>(`/subjects/materials/${materialId}`);
  return data;
}

export async function createUnitAssignment(unitId: string, input: { title: string; description: string; dueDate?: string }) {
  const { data } = await api.post(`/subjects/units/${unitId}/assignments`, input);
  return data;
}

export async function updateUnitAssignment(assignmentId: string, input: { title?: string; description?: string; dueDate?: string }) {
  const { data } = await api.patch(`/subjects/assignments/${assignmentId}`, input);
  return data;
}

export async function updateUnitAssignmentStatus(assignmentId: string, status: 'activo' | 'cerrado') {
  const { data } = await api.patch(`/subjects/assignments/${assignmentId}/status`, { status });
  return data;
}

export async function deleteUnitAssignment(assignmentId: string) {
  const { data } = await api.delete<{ ok: true }>(`/subjects/assignments/${assignmentId}`);
  return data;
}

export async function submitAssignment(assignmentId: string, input: { fileUrl?: string; comment?: string; studentId?: string }) {
  const { data } = await api.post(`/subjects/assignments/${assignmentId}/submissions`, input);
  return data;
}

export async function uploadAssignmentSubmission(assignmentId: string, input: { file: File; comment?: string; studentId?: string }) {
  const form = new FormData();
  form.append('file', input.file);
  if (input.comment) form.append('comment', input.comment);
  if (input.studentId) form.append('studentId', input.studentId);
  const { data } = await api.post(`/subjects/assignments/${assignmentId}/submissions/upload`, form);
  return data;
}

export async function uploadAssignmentSubmissionFiles(assignmentId: string, input: { files: File[]; comment?: string; studentId?: string }) {
  const form = new FormData();
  input.files.forEach((file) => form.append('files', file));
  if (input.comment) form.append('comment', input.comment);
  if (input.studentId) form.append('studentId', input.studentId);
  const { data } = await api.post(`/subjects/assignments/${assignmentId}/submissions/upload`, form);
  return data;
}

export async function deleteAssignmentSubmission(assignmentId: string, studentId?: string) {
  const { data } = await api.delete<{ ok: true }>(`/subjects/assignments/${assignmentId}/submissions`, { data: { studentId } });
  return data;
}

export async function loadAssignmentSubmissions(assignmentId: string) {
  const { data } = await api.get<AssignmentSubmissionReviewRow[]>(`/assignments/${assignmentId}/submissions`);
  return data;
}

export async function reviewAssignmentSubmission(submissionId: string, input: { grade?: number | null; comment?: string | null; status: string }) {
  const { data } = await api.patch(`/submissions/${submissionId}/review`, input);
  return data;
}

export async function replyAssignmentSubmission(submissionId: string, comment?: string | null) {
  const { data } = await api.patch(`/submissions/${submissionId}/reply`, { comment });
  return data;
}

export async function deleteSubmissionFiles(submissionId: string, fileIds: string[]) {
  const { data } = await api.delete<{ ok: true }>(`/submissions/${submissionId}/files`, { data: { fileIds } });
  return data;
}

export async function downloadAssignmentSubmission(submissionId: string) {
  const response = await api.get<Blob>(`/submissions/${submissionId}/download`, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return { blob: response.data, filename: match?.[1] };
}

export async function downloadSubmissionFile(fileId: string) {
  const response = await api.get<Blob>(`/submission-files/${fileId}/download`, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return { blob: response.data, filename: match?.[1] };
}

export async function loadMyProfile() {
  const { data } = await api.get<UserProfileData>('/me/profile');
  return data;
}

export async function loadMySchedule() {
  const { data } = await api.get<ScheduleCalendarEvent[]>('/me/schedule');
  return data;
}

export async function loadMyGrades() {
  const { data } = await api.get<Grade[]>('/me/grades');
  return data;
}

export async function loadMyAttendance() {
  const { data } = await api.get<AttendanceRecord[]>('/me/attendance');
  return data;
}

export async function loadCourses() {
  const { data } = await api.get<Course[]>('/courses');
  return data;
}

export async function loadStudents() {
  const { data } = await api.get<Student[]>('/students');
  return data;
}

export async function loadSubjects() {
  const { data } = await api.get<Subject[]>('/subjects');
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

export async function loadAttendance() {
  const { data } = await api.get<AttendanceRecord[]>('/attendance');
  return data;
}

export async function loadAnnouncements() {
  const { data } = await api.get<Announcement[]>('/announcements');
  return data;
}

export async function loadEvents() {
  const { data } = await api.get<CalendarEvent[]>('/events');
  return data;
}

export async function loadDocuments() {
  const { data } = await api.get<DocumentItem[]>('/documents');
  return data;
}

export async function loadRequests() {
  const { data } = await api.get<RequestTicket[]>('/requests');
  return data;
}

export async function loadSectionStudents(sectionId: string) {
  const { data } = await api.get<SectionStudent[]>(`/sections/${sectionId}/students`);
  return data;
}

export async function saveBulkAttendance(date: string, records: { enrollmentId: string; studentId: string; status: string }[]) {
  const { data } = await api.post<AttendanceRecord[]>('/attendance/bulk', { date, records });
  return data;
}

export async function saveGrade(input: { assessmentId: string; studentId: string; enrollmentId: string; score: number }) {
  const { data } = await api.post<Grade>('/grades', input);
  return data;
}

export async function createAnnouncement(input: { title: string; audience: string; priority: string; body: string }) {
  const { data } = await api.post<Announcement>('/announcements', input);
  return data;
}

export async function createDocument(input: { title: string; category: string; status: string; fileUrl?: string }) {
  const { data } = await api.post<DocumentItem>('/documents', input);
  return data;
}

export async function createSubjectMaterial(input: { subjectId: string; title: string; fileUrl?: string }) {
  const { data } = await api.post<DocumentItem>('/documents/materials', input);
  return data;
}

export async function updateRequestStatus(id: string, status: string) {
  const { data } = await api.patch<RequestTicket>(`/requests/${id}/status`, { status });
  return data;
}
