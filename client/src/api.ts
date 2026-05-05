import axios from 'axios';
import type {
  AdminBundle,
  AdminClassroomRow,
  AdminCourseRow,
  AdminGuardianRow,
  AdminScheduleRow,
  AdminSectionRow,
  AdminStudentRow,
  AdminSubjectRow,
  AdminSummary,
  AdminTeacherRow,
  AdminUserRow,
  AuditLogResponse,
  Announcement,
  Assessment,
  AssignmentSubmissionReviewRow,
  AttendanceAdminSummary,
  AttendanceContext,
  AttendanceRecord,
  AttendanceRecordsResponse,
  AttendanceStatus,
  AuthSession,
  CalendarEvent,
  Course,
  DashboardData,
  DocumentItem,
  Grade,
  GradebookAdminSummary,
  GradebookContext,
  GradebookEvaluation,
  GradebookRecordsResponse,
  GradeStatus,
  GuardianGradebookResponse,
  MyGradebookResponse,
  GuardianAttendanceResponse,
  MyAttendanceResponse,
  MySubject,
  RequestTicket,
  RoleDashboard,
  ScheduleCalendarEvent,
  SectionStudent,
  Student,
  Subject,
  SubjectDetailData,
  UserPreferences,
  UserProfileData,
  UserNotificationResponse
} from './types';

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
      try {
        const { data } = await axios.post<AuthSession>('/api/auth/refresh', { refreshToken: current.refreshToken });
        const nextSession = { ...current, ...data };
        localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
        original.headers.Authorization = `Bearer ${nextSession.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem(sessionStorageKey);
        window.dispatchEvent(new CustomEvent('school-session-expired'));
      }
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

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ message: string; resetUrl?: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(input: { token: string; password: string }) {
  const { data } = await api.post<{ ok: true; message: string }>('/auth/reset-password', input);
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

export async function addSubmissionComment(submissionId: string, body: string) {
  const { data } = await api.post(`/submissions/${submissionId}/comments`, { body });
  return data;
}

export async function addAssignmentComment(assignmentId: string, body: string) {
  const { data } = await api.post(`/assignments/${assignmentId}/comments`, { body });
  return data;
}

export async function deleteSubmissionComment(commentId: string) {
  const { data } = await api.delete<{ ok: true }>(`/submission-comments/${commentId}`);
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

export async function updateMyProfile(input: { name: string; lastName: string }) {
  const { data } = await api.patch('/me/profile', input);
  return data;
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  const { data } = await api.patch<{ ok: true }>('/me/password', input);
  return data;
}

export async function loadMyNotifications() {
  const { data } = await api.get<UserNotificationResponse>('/me/notifications');
  return data;
}

export async function markMyNotificationRead(id: string) {
  const { data } = await api.patch<{ ok: true }>(`/me/notifications/${id}/read`);
  return data;
}

export async function markAllMyNotificationsRead() {
  const { data } = await api.patch<{ ok: true; count: number }>('/me/notifications/read-all');
  return data;
}

export async function updateMyPreferences(preferences: UserPreferences) {
  const { data } = await api.patch<{ preferences: UserPreferences }>('/me/preferences', preferences);
  return data.preferences;
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

export async function markAnnouncementRead(id: string) {
  const { data } = await api.post<Announcement>(`/announcements/${id}/read`);
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

export async function loadAttendanceContext() {
  const { data } = await api.get<AttendanceContext>('/attendance/context');
  return data;
}

export async function loadAttendanceRecords(input: { sectionId: string; subjectId: string; date: string }) {
  const { data } = await api.get<AttendanceRecordsResponse>('/attendance/records', { params: input });
  return data;
}

export async function saveAttendanceBulk(input: { sectionId: string; subjectId: string; date: string; records: Array<{ studentId: string; status: AttendanceStatus; note?: string }> }) {
  const { data } = await api.post<{ ok: true; records: number }>('/attendance/bulk', input);
  return data;
}

export async function loadAttendanceMe() {
  const { data } = await api.get<MyAttendanceResponse>('/attendance/me');
  return data;
}

export async function loadAttendanceGuardian() {
  const { data } = await api.get<GuardianAttendanceResponse>('/attendance/guardian');
  return data;
}

export async function loadAttendanceSummary() {
  const { data } = await api.get<AttendanceAdminSummary>('/attendance/summary');
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

export type AdminUserPayload = {
  name: string;
  lastName?: string;
  email: string;
  role?: string;
  department?: string;
  password?: string;
  rut?: string;
  phone?: string;
  birthDate?: string;
  sectionId?: string;
  studentIds?: string[];
  relationship?: string;
};

export async function loadAdminSummary() {
  const { data } = await api.get<AdminSummary>('/admin/summary');
  return data;
}

export type AdminCourseSectionInput = { name: string; teacherId?: string; classroomId?: string };
export type AdminCoursePayload = { name: string; levelId: string; sections?: AdminCourseSectionInput[] };
export type AdminClassroomPayload = { name: string; capacity: number; type?: AdminClassroomRow['type']; floor?: number };
export type AdminSchedulePayload = { teacherId: string; sectionId: string; subjectId: string; classroomId: string; weekday: number; startsAt: string; endsAt: string };

export async function loadAdminBundle(): Promise<AdminBundle> {
  const [summary, users, students, teachers, guardians, courses, sections, classrooms, schedules, subjects] = await Promise.all([
    loadAdminSummary(),
    api.get<AdminUserRow[]>('/admin/users').then((res) => res.data),
    api.get<AdminStudentRow[]>('/admin/students').then((res) => res.data),
    api.get<AdminTeacherRow[]>('/admin/teachers').then((res) => res.data),
    api.get<AdminGuardianRow[]>('/admin/guardians').then((res) => res.data),
    api.get<AdminCourseRow[]>('/admin/courses').then((res) => res.data),
    api.get<AdminSectionRow[]>('/admin/sections').then((res) => res.data),
    api.get<AdminClassroomRow[]>('/admin/classrooms').then((res) => res.data),
    api.get<AdminScheduleRow[]>('/admin/schedules').then((res) => res.data),
    api.get<AdminSubjectRow[]>('/admin/subjects').then((res) => res.data)
  ]);
  return { summary, users, students, teachers, guardians, courses, sections, classrooms, schedules, subjects };
}

export async function loadAdminAudit(input: { page?: number; pageSize?: number; userId?: string; action?: string; entity?: string; search?: string; from?: string; to?: string }) {
  const { data } = await api.get<AuditLogResponse>('/admin/audit', { params: input });
  return data;
}

export async function createAdminUser(input: AdminUserPayload) {
  const { data } = await api.post<AdminUserRow>('/admin/users', input);
  return data;
}

export async function updateAdminUser(id: string, input: Partial<AdminUserPayload>) {
  const { data } = await api.patch<AdminUserRow>(`/admin/users/${id}`, input);
  return data;
}

export async function setAdminUserStatus(id: string, isActive: boolean) {
  const { data } = await api.patch(`/admin/users/${id}/status`, { isActive });
  return data;
}

export async function resetAdminUserPassword(id: string, password?: string) {
  const { data } = await api.patch<{ ok?: true }>(`/admin/users/${id}/reset-password`, { password });
  return data;
}

export async function createAdminStudent(input: AdminUserPayload) {
  const { data } = await api.post('/admin/students', input);
  return data;
}

export async function updateAdminStudent(id: string, input: Partial<AdminUserPayload>) {
  const { data } = await api.patch(`/admin/students/${id}`, input);
  return data;
}

export async function setAdminStudentStatus(id: string, isActive: boolean) {
  const { data } = await api.patch(`/admin/students/${id}/status`, { isActive });
  return data;
}

export async function createAdminTeacher(input: AdminUserPayload) {
  const { data } = await api.post('/admin/teachers', input);
  return data;
}

export async function updateAdminTeacher(id: string, input: Partial<AdminUserPayload>) {
  const { data } = await api.patch(`/admin/teachers/${id}`, input);
  return data;
}

export async function setAdminTeacherStatus(id: string, isActive: boolean) {
  const { data } = await api.patch(`/admin/teachers/${id}/status`, { isActive });
  return data;
}

export async function assignAdminTeacher(id: string, input: { subjectIds?: string[]; sectionIds?: string[] }) {
  const { data } = await api.post(`/admin/teachers/${id}/assignments`, input);
  return data;
}

export async function removeAdminTeacherAssignment(input: { teacherId: string; subjectId: string; sectionId?: string }) {
  const { data } = await api.delete('/admin/assignments/teacher-subject-section', { data: input });
  return data;
}

export async function createAdminGuardian(input: AdminUserPayload) {
  const { data } = await api.post('/admin/guardians', input);
  return data;
}

export async function updateAdminGuardian(id: string, input: Partial<AdminUserPayload>) {
  const { data } = await api.patch(`/admin/guardians/${id}`, input);
  return data;
}

export async function setAdminGuardianStatus(id: string, isActive: boolean) {
  const { data } = await api.patch(`/admin/guardians/${id}/status`, { isActive });
  return data;
}

export async function linkAdminGuardianStudents(id: string, input: { studentIds: string[]; relationship?: string }) {
  const { data } = await api.post(`/admin/guardians/${id}/students`, input);
  return data;
}

export async function unlinkAdminGuardianStudent(input: { guardianId: string; studentId: string }) {
  const { data } = await api.delete('/admin/assignments/guardian-students', { data: input });
  return data;
}

export async function createAdminCourse(input: AdminCoursePayload) {
  const { data } = await api.post<AdminCourseRow>('/admin/courses', input);
  return data;
}

export async function updateAdminCourse(id: string, input: { name?: string; levelId?: string }) {
  const { data } = await api.patch<AdminCourseRow>(`/admin/courses/${id}`, input);
  return data;
}

export async function setAdminCourseStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<AdminCourseRow>(`/admin/courses/${id}/status`, { isActive });
  return data;
}

export async function createAdminSection(input: { name: string; courseId: string; teacherId?: string; classroomId?: string }) {
  const { data } = await api.post<AdminSectionRow>('/admin/sections', input);
  return data;
}

export async function updateAdminSection(id: string, input: { name?: string; courseId?: string; teacherId?: string; classroomId?: string }) {
  const { data } = await api.patch<AdminSectionRow>(`/admin/sections/${id}`, input);
  return data;
}

export async function setAdminSectionStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<AdminSectionRow>(`/admin/sections/${id}/status`, { isActive });
  return data;
}

export async function deleteAdminSection(id: string) {
  const { data } = await api.delete(`/admin/sections/${id}`);
  return data;
}

export async function createAdminClassroom(input: AdminClassroomPayload) {
  const { data } = await api.post<AdminClassroomRow>('/admin/classrooms', input);
  return data;
}

export async function updateAdminClassroom(id: string, input: Partial<AdminClassroomPayload>) {
  const { data } = await api.patch<AdminClassroomRow>(`/admin/classrooms/${id}`, input);
  return data;
}

export async function setAdminClassroomStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<AdminClassroomRow>(`/admin/classrooms/${id}/status`, { isActive });
  return data;
}

export async function deleteAdminClassroom(id: string) {
  const { data } = await api.delete(`/admin/classrooms/${id}`);
  return data;
}

export async function createAdminSchedule(input: AdminSchedulePayload) {
  const { data } = await api.post<AdminScheduleRow>('/admin/schedules', input);
  return data;
}

export async function updateAdminSchedule(id: string, input: Partial<AdminSchedulePayload>) {
  const { data } = await api.patch<AdminScheduleRow>(`/admin/schedules/${id}`, input);
  return data;
}

export async function setAdminScheduleStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<AdminScheduleRow>(`/admin/schedules/${id}/status`, { isActive });
  return data;
}

export async function deleteAdminSchedule(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/admin/schedules/${id}`);
  return data;
}

export async function createAdminSubject(input: { name: string; code: string; courseIds?: string[]; sectionIds?: string[]; teacherIds?: string[] }) {
  const { data } = await api.post<AdminSubjectRow>('/admin/subjects', input);
  return data;
}

export async function updateAdminSubject(id: string, input: { name?: string; code?: string; courseIds?: string[]; sectionIds?: string[]; teacherIds?: string[] }) {
  const { data } = await api.patch<AdminSubjectRow>(`/admin/subjects/${id}`, input);
  return data;
}

export async function assignAdminSubjectTeacher(id: string, input: { teacherId: string; sectionId?: string }) {
  const { data } = await api.post<AdminSubjectRow>(`/admin/subjects/${id}/assign-teacher`, input);
  return data;
}

export async function assignAdminStudentSection(studentId: string, sectionId: string) {
  const { data } = await api.patch(`/admin/students/${studentId}/section`, { sectionId });
  return data;
}

export async function clearAdminStudentSection(studentId: string) {
  const { data } = await api.delete(`/admin/students/${studentId}/section`);
  return data;
}
