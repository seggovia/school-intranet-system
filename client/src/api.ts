import axios from 'axios';
import type { Announcement, Assessment, AttendanceRecord, AuthSession, CalendarEvent, Course, DashboardData, DocumentItem, Grade, MySubject, RequestTicket, RoleDashboard, ScheduleItem, SectionStudent, Student, Subject } from './types';

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

export async function loadMySchedule() {
  const { data } = await api.get<ScheduleItem[]>('/me/schedule');
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
