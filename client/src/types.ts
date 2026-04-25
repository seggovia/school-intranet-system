export type Role = 'admin' | 'director' | 'teacher' | 'student' | 'guardian' | 'inspector';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  department: string;
  roles: Role[];
  primaryRole: Role;
  permissions: string[];
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Kpi {
  label: string;
  value: string | number;
  trend: string;
  tone: 'positive' | 'warning' | 'critical';
}

export interface DashboardData {
  kpis: Kpi[];
  attendanceSeries: { month: string; asistencia: number; atrasos: number }[];
  gradeSeries: { subject: string; promedio: number }[];
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

export interface Subject {
  id: string;
  name: string;
  code: string;
  teachers: string[];
  sections: string[];
}

export interface Assessment {
  id: string;
  title: string;
  subject: string;
  date: string;
  weight: number;
  grades: number;
}

export interface Grade {
  id: string;
  studentId?: string;
  student: string;
  course: string;
  section?: string;
  subject: string;
  assessment: string;
  score: number;
}

export interface AttendanceRecord {
  id: string;
  studentId?: string;
  student: string;
  course?: string;
  section?: string;
  date: string;
  status: 'presente' | 'ausente' | 'atrasado' | 'justificado';
  note?: string | null;
}

export type AttendanceStatus = AttendanceRecord['status'];

export interface ScheduleItem {
  id: string;
  weekday: number;
  weekdayName: string;
  startsAt: string;
  endsAt: string;
  subjectId: string;
  subject: string;
  teacher: string;
  classroom: string;
  section: string;
}

export interface ScheduleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  subjectId: string;
  subject: string;
  teacher: string;
  room: string;
  section: string;
  course: string;
}

export interface UnitContentItem {
  id: string;
  type: 'presentacion' | 'guia' | 'documento' | 'link';
  title: string;
  status: string;
  fileUrl?: string | null;
  owner?: string;
  updatedAt?: string;
}

export interface AssignmentSubmissionItem {
  id: string;
  studentId: string;
  student: string;
  fileUrl?: string | null;
  originalName?: string | null;
  comment?: string | null;
  status: string;
  submittedAt: string;
}

export interface UnitAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  openedAt?: string | null;
  status: string;
  submissions: number;
  submissionItems?: AssignmentSubmissionItem[];
}

export interface SubjectUnit {
  id: string;
  title: string;
  description: string;
  duration?: string;
  outcomes?: string[];
  bibliography?: string[];
  contents: UnitContentItem[];
  assignments?: UnitAssignment[];
}

export interface SubjectDetailData {
  subject: {
    id: string;
    name: string;
    code: string;
  };
  teacher: string;
  section: string;
  room: string;
  schedule: ScheduleItem[];
  units: SubjectUnit[];
  materials: DocumentItem[];
  assessments: { id: string; title: string; date: string; grades: number }[];
  sections: {
    id: string;
    name: string;
    teacher: string;
    classroom: string;
    students: SectionStudent[];
    schedules: Omit<ScheduleItem, 'weekdayName' | 'subjectId' | 'section'>[];
  }[];
}

export interface SectionSummary {
  id: string;
  name: string;
  teacher: string;
  classroom: string;
  students: number;
  subjects: string[];
}

export interface SectionStudent {
  id: string;
  userId?: string;
  enrollmentId: string;
  name: string;
  course?: string;
  attendance?: number;
  average?: number;
  attendanceRecords?: number;
  grades?: number;
}

export interface MySubject {
  id: string;
  name: string;
  code: string;
  sectionId: string;
  section: string;
  teacher: string;
  schedules: ScheduleItem[];
  students: SectionStudent[];
  assessments: { id: string; title: string; date: string; grades: number }[];
  units: { id: string; title: string; topics: string[] }[];
  materials: DocumentItem[];
}

export interface RoleDashboard {
  role: Role;
  profile: { id: string; name: string; email: string; roles: Role[] };
  stats: Kpi[];
  sections: SectionSummary[];
  linkedStudents: { id: string; name: string; relationship: string }[];
  announcements: { id: string; title: string; priority: string }[];
  documents: DocumentItem[];
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

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  owner: string;
  updatedAt: string;
  status: 'vigente' | 'revision' | 'archivado';
  fileUrl?: string | null;
}

export interface RequestTicket {
  id: string;
  subject: string;
  requester: string;
  area: string;
  status: 'nuevo' | 'en_proceso' | 'resuelto';
  createdAt: string;
}
