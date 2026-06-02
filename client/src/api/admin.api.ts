import { api } from '../api';
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
  AuditLogResponse
} from '../types';

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
