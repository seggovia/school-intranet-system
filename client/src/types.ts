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

export type AttendanceStatus = 'presente' | 'ausente' | 'atrasado' | 'justificado';
export type AttendanceRosterStatus = AttendanceStatus | 'sin_registrar';

export interface AttendanceContext {
  sections: Array<{ id: string; name: string; subjects: Array<{ id: string; name: string; code: string }> }>;
}

export interface AttendanceRosterRecord {
  studentId: string;
  enrollmentId: string;
  name: string;
  email: string;
  status: AttendanceRosterStatus;
  note: string;
  registered: boolean;
  updatedAt: string | null;
}

export interface AttendanceRecordsResponse {
  section: { id: string; name: string };
  subject: { id: string; name: string } | null;
  date: string;
  students: AttendanceRosterRecord[];
}

export interface AttendanceHistoryItem {
  id: string;
  date: string;
  subject: string;
  section: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface AttendanceSummary {
  presente: number;
  ausente: number;
  atrasado: number;
  justificado: number;
  total: number;
  percentage: number;
}

export interface MyAttendanceResponse {
  summary: AttendanceSummary;
  history: AttendanceHistoryItem[];
}

export interface GuardianAttendanceResponse {
  students: Array<{ id: string; name: string; summary: AttendanceSummary; history: AttendanceHistoryItem[] }>;
}

export interface AttendanceAdminSummary {
  date: string;
  totals: AttendanceSummary;
  sections: Array<{ id: string; name: string; students: number; records: number; summary: AttendanceSummary }>;
}

export type GradeStatus = 'con_nota' | 'pendiente' | 'ausente' | 'eximido';
export type EvaluationType = 'prueba' | 'trabajo' | 'tarea' | 'proyecto' | 'participacion';

export interface GradebookContext {
  sections: Array<{ id: string; name: string; subjects: Array<{ id: string; name: string; code: string }> }>;
}

export interface GradebookEvaluation {
  id: string;
  title: string;
  subjectId: string;
  subject: string;
  sectionId: string;
  section: string;
  date: string;
  weight: number;
  type: EvaluationType;
  description?: string | null;
  grades: number;
}

export interface GradebookRecord {
  studentId: string;
  enrollmentId: string;
  name: string;
  email: string;
  score: number | null;
  status: GradeStatus;
  comment: string;
  registered: boolean;
  updatedAt: string | null;
}

export interface GradebookRecordsResponse {
  evaluation: GradebookEvaluation;
  students: GradebookRecord[];
}

export interface GradebookSummary {
  average: number | null;
  total: number;
  scored: number;
  pending: number;
  absent: number;
  exempt: number;
  subjects: Array<{ subjectId: string; subject: string; average: number | null; grades: number }>;
}

export interface GradebookHistoryItem {
  id: string;
  evaluationId: string;
  evaluation: string;
  subject: string;
  section: string;
  date: string;
  type: EvaluationType;
  weight: number;
  status: GradeStatus;
  score: number | null;
  comment?: string | null;
}

export interface MyGradebookResponse {
  summary: GradebookSummary;
  history: GradebookHistoryItem[];
}

export interface GuardianGradebookResponse {
  students: Array<{ id: string; name: string; summary: GradebookSummary; history: GradebookHistoryItem[] }>;
}

export interface GradebookAdminSummary {
  sections: Array<{
    id: string;
    name: string;
    average: number | null;
    students: number;
    belowAverage: number;
    subjects: GradebookSummary['subjects'];
    recentEvaluations: GradebookEvaluation[];
  }>;
}

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
  files?: Array<{ id: string; originalName: string; mimeType?: string | null; size?: number | null; createdAt?: string | null }>;
  comment?: string | null;
  status: string;
  grade?: number | null;
  commentThread?: { teacher?: string | null; student?: string | null };
  comments?: Array<{ id: string; body: string; authorId: string; author: string; createdAt?: string | null }>;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  submittedAt: string;
}

export interface AssignmentSubmissionReviewRow {
  studentId: string;
  student: string;
  status: string;
  submission: AssignmentSubmissionItem | null;
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

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  roles: Role[];
  timezone: string;
  lastAccess: string;
  courses: Array<{ id: string; name: string; classroom: string; students: number }>;
  subjects: Array<{ id: string; name: string; code: string; section: string }>;
  linkedStudents: Array<{ id: string; name: string; relationship: string }>;
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

export interface AdminOption {
  id: string;
  label: string;
  meta?: string;
}

export interface AdminSummary {
  users: number;
  activeUsers: number;
  students: number;
  teachers: number;
  guardians: number;
  courses: number;
  sections: number;
  subjects: number;
  temporaryPassword: string;
  options: {
    roles: AdminOption[];
    levels: AdminOption[];
    classrooms: AdminOption[];
    courses: AdminOption[];
    sections: AdminOption[];
    subjects: AdminOption[];
    teachers: AdminOption[];
    students: AdminOption[];
    guardians: AdminOption[];
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  role: Role;
  roles: Role[];
  isActive: boolean;
  teacherId?: string | null;
  studentId?: string | null;
  guardianId?: string | null;
  section?: string | null;
  linkedStudents?: string[];
}

export interface AdminStudentRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  rut: string;
  birthDate: string;
  isActive: boolean;
  sectionId: string | null;
  section: string;
  course: string;
  classroom: string;
  guardians: Array<{ id: string; name: string; relationship: string }>;
}

export interface AdminTeacherRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeCode: string;
  specialty: string;
  isActive: boolean;
  subjects: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; course: string; classroom: string }>;
}

export interface AdminGuardianRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  students: Array<{ id: string; name: string; relationship: string }>;
}

export interface AdminCourseRow {
  id: string;
  name: string;
  levelId: string;
  level: string;
  sections: number;
  students: number;
  subjects: Array<{ id: string; name: string }>;
}

export interface AdminSectionRow {
  id: string;
  name: string;
  courseId: string;
  course: string;
  teacherId?: string | null;
  teacher: string;
  classroomId?: string | null;
  classroom: string;
  students: number;
  subjects: Array<{ id: string; name: string }>;
}

export interface AdminSubjectRow {
  id: string;
  name: string;
  code: string;
  teachers: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; course: string }>;
}

export interface AdminBundle {
  summary: AdminSummary;
  users: AdminUserRow[];
  students: AdminStudentRow[];
  teachers: AdminTeacherRow[];
  guardians: AdminGuardianRow[];
  courses: AdminCourseRow[];
  sections: AdminSectionRow[];
  subjects: AdminSubjectRow[];
}
