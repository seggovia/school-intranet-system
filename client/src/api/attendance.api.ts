import { api } from '../api';
import type {
  AttendanceAdminSummary,
  AttendanceContext,
  AttendanceRecord,
  AttendanceRecordsResponse,
  AttendanceStatus,
  GuardianAttendanceResponse,
  MyAttendanceResponse,
  SectionStudent
} from '../types';

export async function loadMyAttendance() {
  const { data } = await api.get<AttendanceRecord[]>('/me/attendance');
  return data;
}

export async function loadAttendance() {
  const { data } = await api.get<AttendanceRecord[]>('/attendance');
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
