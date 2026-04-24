export type Role = 'admin' | 'director' | 'teacher' | 'student' | 'guardian' | 'inspector';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  department: string;
}

export interface Student {
  id: string;
  name: string;
  course: string;
  guardian: string;
  attendance: number;
  average: number;
  risk: 'bajo' | 'medio' | 'alto';
}

export interface Course {
  id: string;
  name: string;
  teacher: string;
  room: string;
  students: number;
  attendance: number;
  average: number;
}

export interface Announcement {
  id: string;
  title: string;
  audience: string;
  author: string;
  date: string;
  priority: 'normal' | 'alta' | 'critica';
  body: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'academico' | 'convivencia' | 'administrativo' | 'familias';
  location: string;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  owner: string;
  updatedAt: string;
  status: 'vigente' | 'revision' | 'archivado';
}

export interface RequestTicket {
  id: string;
  subject: string;
  requester: string;
  area: string;
  status: 'nuevo' | 'en_proceso' | 'resuelto';
  createdAt: string;
}
