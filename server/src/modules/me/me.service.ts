import type { JwtUser } from '../auth/auth.types.js';
import bcrypt from 'bcryptjs';
import { HttpError } from '../../shared/http-error.js';
import { MeRepository } from './me.repository.js';
import type { ChangePasswordInput, UpdateProfileInput, UserPreferencesInput } from './me.validators.js';

const repository = new MeRepository();

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const defaultPreferences: UserPreferencesInput = {
  theme: 'system',
  language: 'es',
  notifications: {
    email: true,
    academic: true,
    tickets: true
  }
};

function serializePreferences(value: unknown): UserPreferencesInput {
  const preferences = value as Partial<UserPreferencesInput> | null | undefined;
  return {
    ...defaultPreferences,
    ...(preferences ?? {}),
    notifications: {
      ...defaultPreferences.notifications,
      ...(preferences?.notifications ?? {})
    }
  };
}

function average(values: Array<number | null>) {
  const scored = values.filter((value): value is number => value !== null);
  if (!scored.length) return 0;
  return Number((scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(1));
}

function attendanceRate(records: { status: string }[]) {
  if (!records.length) return 100;
  const present = records.filter((item) => item.status === 'presente' || item.status === 'atrasado').length;
  return Math.round((present / records.length) * 100);
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'US';
}

function splitName(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length <= 1) return { name: parts[0] ?? '', lastName: '' };
  return { name: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' };
}

function serializeSchedule(schedule: {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  subject: { id: string; name: string };
  teacher: { user: { name: string } };
  classroom: { name: string };
  section: { course: { name: string }; name: string };
}) {
  return {
    id: schedule.id,
    weekday: schedule.weekday,
    weekdayName: weekdayNames[schedule.weekday] ?? `Dia ${schedule.weekday}`,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    subjectId: schedule.subject.id,
    subject: schedule.subject.name,
    teacher: schedule.teacher.user.name,
    classroom: schedule.classroom.name,
    section: `${schedule.section.course.name} ${schedule.section.name}`
  };
}

function dateForWeekday(weekday: number) {
  const today = new Date();
  const currentWeekday = today.getDay();
  const mondayOffset = currentWeekday === 0 ? -6 : 1 - currentWeekday;
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  date.setDate(today.getDate() + mondayOffset + (weekday - 1));
  return date.toISOString().slice(0, 10);
}

function serializeCalendarSchedule(schedule: {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  subject: { id: string; name: string };
  teacher: { id: string; user: { name: string; email: string; department: string } };
  classroom: { id: string; name: string; capacity: number; floor: number; type: string };
  section: {
    id: string;
    course: { name: string; level?: { name: string } | null };
    name: string;
    enrollments?: Array<{ student: { id: string; user: { name: string } } }>;
  };
}) {
  const date = dateForWeekday(schedule.weekday);
  const section = `${schedule.section.course.name} ${schedule.section.name}`;

  return {
    id: schedule.id,
    title: schedule.subject.name,
    start: `${date}T${schedule.startsAt}`,
    end: `${date}T${schedule.endsAt}`,
    subjectId: schedule.subject.id,
    subject: schedule.subject.name,
    teacherId: schedule.teacher.id,
    teacher: schedule.teacher.user.name,
    teacherEmail: schedule.teacher.user.email,
    teacherDepartment: schedule.teacher.user.department,
    room: schedule.classroom.name,
    roomId: schedule.classroom.id,
    roomCapacity: schedule.classroom.capacity,
    roomFloor: schedule.classroom.floor,
    roomType: schedule.classroom.type,
    section,
    sectionId: schedule.section.id,
    course: section,
    weekday: schedule.weekday,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    level: schedule.section.course.level?.name ?? null,
    students: schedule.section.enrollments?.map((enrollment) => ({ id: enrollment.student.id, name: enrollment.student.user.name })) ?? []
  };
}

function serializeDocument(document: { id: string; title: string; status: string; fileUrl: string | null; updatedAt: Date; category: { name: string }; owner: { name: string } }) {
  return {
    id: document.id,
    title: document.title,
    category: document.category.name,
    owner: document.owner.name,
    updatedAt: document.updatedAt.toISOString().slice(0, 10),
    status: document.status,
    fileUrl: document.fileUrl ?? '#'
  };
}

function serializeObservation(observation: { id: string; studentId: string; student?: { user: { name: string } }; author: { name: string }; section: { course: { name: string }; name: string } | null; body: string; type: string; date: Date; isVisible: boolean; createdAt: Date }) {
  return {
    id: observation.id,
    studentId: observation.studentId,
    student: observation.student?.user.name,
    author: observation.author.name,
    section: observation.section ? `${observation.section.course.name} ${observation.section.name}` : null,
    body: observation.body,
    type: observation.type,
    date: observation.date.toISOString().slice(0, 10),
    isVisible: observation.isVisible,
    createdAt: observation.createdAt.toISOString()
  };
}

export class MeService {
  async profile(user: JwtUser) {
    const [profile, sections] = await Promise.all([
      repository.findUserProfile(user.id),
      this.sectionsForUser(user)
    ]);
    const subjectMap = new Map<string, { id: string; name: string; code: string; section: string }>();
    sections.forEach((section) => {
      section.subjects.forEach((item) => {
        subjectMap.set(`${item.subject.id}-${section.id}`, {
          id: item.subject.id,
          name: item.subject.name,
          code: item.subject.code,
          section: `${section.course.name} ${section.name}`
        });
      });
    });
    return {
      id: user.id,
      name: profile?.name ?? user.email,
      email: profile?.email ?? user.email,
      avatar: profile?.avatar ?? '',
      department: profile?.department ?? '',
      roles: user.roles,
      roleLabels: profile?.roles.map((item) => item.role.label) ?? user.roles,
      isActive: profile?.isActive ?? true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: profile?.createdAt.toISOString() ?? null,
      updatedAt: profile?.updatedAt.toISOString() ?? null,
      lastAccess: profile?.updatedAt.toISOString() ?? new Date().toISOString(),
      personal: splitName(profile?.name ?? ''),
      courses: sections.map((section) => ({
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        classroom: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.length
      })),
      subjects: Array.from(subjectMap.values()),
      linkedStudents: profile?.guardian?.students.map((item) => ({ id: item.student.id, name: item.student.user.name, relationship: item.relationship })) ?? [],
      guardians: profile?.student?.guardians.map((item) => ({ id: item.guardian.id, name: item.guardian.user.name, relationship: item.relationship })) ?? [],
      academicSummary: {
        average: profile?.student ? average(profile.student.grades.map((grade) => grade.score)) : average(sections.flatMap((section) => section.enrollments.flatMap((enrollment) => enrollment.student.grades.map((grade) => grade.score)))),
        attendance: profile?.student ? attendanceRate(profile.student.attendance) : attendanceRate(sections.flatMap((section) => section.enrollments.flatMap((enrollment) => enrollment.student.attendance))),
        courses: sections.length,
        subjects: subjectMap.size
      },
      security: {
        userId: user.id,
        emailVerified: true,
        passwordManagedLocally: true,
        lastPasswordResetRequest: profile?.passwordResetTokens[0]?.createdAt.toISOString() ?? null
      },
      preferences: serializePreferences(profile?.preferences)
    };
  }

  async updateProfile(user: JwtUser, input: UpdateProfileInput) {
    const fullName = `${input.name} ${input.lastName}`.trim();
    const updated = await repository.updateProfile(user.id, { name: fullName, avatar: initials(fullName) });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
      department: updated.department,
      isActive: updated.isActive,
      personal: splitName(updated.name)
    };
  }

  async changePassword(user: JwtUser, input: ChangePasswordInput) {
    const current = await repository.findUserForPassword(user.id);
    if (!current) throw new HttpError(404, 'Usuario no encontrado.');
    const valid = await bcrypt.compare(input.currentPassword, current.passwordHash);
    if (!valid) throw new HttpError(400, 'La contraseña actual no es correcta.');
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await repository.updatePassword(user.id, passwordHash);
    return { ok: true };
  }

  async updatePreferences(user: JwtUser, preferences: UserPreferencesInput) {
    const updated = await repository.updatePreferences(user.id, serializePreferences(preferences));
    return { preferences: serializePreferences(updated.preferences) };
  }

  async dashboard(user: JwtUser) {
    const [profile, sections, announcements, documents] = await Promise.all([
      repository.findUserProfile(user.id),
      this.sectionsForUser(user),
      repository.listAnnouncements(),
      repository.listDocuments()
    ]);

    const students = sections.flatMap((section) => section.enrollments.map((enrollment) => enrollment.student));
    const grades = students.flatMap((student) => student.grades.map((grade) => grade.score));
    const attendance = students.flatMap((student) => student.attendance);
    const observations = user.roles.includes('guardian')
      ? (profile?.guardian?.students.flatMap((item) => item.student.observations.map((observation) => serializeObservation({ ...observation, student: item.student }))) ?? [])
      : (profile?.student?.observations.map((observation) => serializeObservation(observation)) ?? []);

    return {
      role: user.roles[0] ?? 'student',
      profile: {
        id: user.id,
        name: profile?.name ?? user.email,
        email: profile?.email ?? user.email,
        roles: user.roles
      },
      stats: [
        { label: 'Cursos', value: sections.length, trend: 'Asignaciones activas', tone: 'positive' },
        { label: 'Estudiantes', value: new Set(students.map((student) => student.id)).size, trend: 'Nomina visible', tone: 'positive' },
        { label: 'Promedio', value: average(grades), trend: 'Evaluaciones registradas', tone: average(grades) && average(grades) < 4.5 ? 'warning' : 'positive' },
        { label: 'Asistencia', value: `${attendanceRate(attendance)}%`, trend: 'Ultimos registros', tone: attendanceRate(attendance) < 85 ? 'critical' : 'positive' }
      ],
      sections: sections.map((section) => ({
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        teacher: section.headTeacher?.user.name ?? 'Sin asignar',
        classroom: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.length,
        subjects: section.subjects.map((item) => item.subject.name)
      })),
      linkedStudents: profile?.guardian?.students.map((item) => ({ id: item.student.id, name: item.student.user.name, relationship: item.relationship })) ?? [],
      observations: observations.slice(0, 8),
      announcements: announcements.map((announcement) => ({ id: announcement.id, title: announcement.title, priority: announcement.priority })),
      documents: documents.map(serializeDocument)
    };
  }

  async subjects(user: JwtUser) {
    const [sections, documents] = await Promise.all([this.sectionsForUser(user), repository.listDocuments()]);
    return sections.flatMap((section) => section.subjects.map((item) => ({
      id: item.subject.id,
      name: item.subject.name,
      code: item.subject.code,
      sectionId: section.id,
      section: `${section.course.name} ${section.name}`,
      teacher: section.headTeacher?.user.name ?? 'Sin asignar',
      schedules: section.schedules.filter((schedule) => schedule.subjectId === item.subject.id).map((schedule) => serializeSchedule({ ...schedule, section })),
      students: section.enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        userId: enrollment.student.userId,
        name: enrollment.student.user.name,
        enrollmentId: enrollment.id,
        attendance: attendanceRate(enrollment.student.attendance),
        average: average(enrollment.student.grades.map((grade) => grade.score))
      })),
      assessments: item.subject.assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        date: assessment.date.toISOString().slice(0, 10),
        grades: assessment.grades.length
      })),
      units: [
        { id: `${item.subject.id}-u1`, title: `Unidad 1 - Fundamentos de ${item.subject.name}`, topics: ['Conceptos base', 'Actividades practicas', 'Evaluacion formativa'] },
        { id: `${item.subject.id}-u2`, title: `Unidad 2 - Aplicacion`, topics: ['Resolucion de problemas', 'Trabajo colaborativo', 'Cierre de unidad'] }
      ],
      materials: documents.filter((document) => document.category.name === item.subject.name).map(serializeDocument)
    })));
  }

  async schedule(user: JwtUser) {
    const sections = await this.sectionsForUser(user);
    return sections.flatMap((section) => section.schedules.map((schedule) => serializeCalendarSchedule({ ...schedule, section })));
  }

  async grades(user: JwtUser) {
    const sections = await this.sectionsForUser(user);
    return sections.flatMap((section) => section.enrollments.flatMap((enrollment) => enrollment.student.grades.map((grade) => ({
      id: grade.id,
      studentId: enrollment.student.id,
      student: enrollment.student.user.name,
      section: `${section.course.name} ${section.name}`,
      subject: grade.assessment.subject.name,
      assessment: grade.assessment.title,
      score: grade.score ?? 0
    }))));
  }

  async attendance(user: JwtUser) {
    const sections = await this.sectionsForUser(user);
    return sections.flatMap((section) => section.enrollments.flatMap((enrollment) => enrollment.student.attendance.map((record) => ({
      id: record.id,
      studentId: enrollment.student.id,
      student: enrollment.student.user.name,
      section: `${section.course.name} ${section.name}`,
      date: record.date.toISOString().slice(0, 10),
      status: record.status,
      note: record.note
    }))));
  }

  private sectionsForUser(user: JwtUser) {
    if (user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role))) {
      return repository.listAllSections();
    }
    if (user.roles.includes('teacher')) {
      return repository.findTeacherSections(user.id);
    }
    if (user.roles.includes('guardian')) {
      return repository.findGuardianStudentSections(user.id);
    }
    return repository.findStudentSections(user.id);
  }
}
