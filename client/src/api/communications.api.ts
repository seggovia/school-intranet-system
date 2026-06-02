import { api } from '../api';
import type { Announcement, CalendarEvent, DocumentItem } from '../types';

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
