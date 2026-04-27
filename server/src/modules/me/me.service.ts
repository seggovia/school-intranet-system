import type { JwtUser } from '../auth/auth.types.js';
import { MeRepository } from './me.repository.js';

const repository = new MeRepository();

const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

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
  teacher: { user: { name: string } };
  classroom: { name: string };
  section: { course: { name: string }; name: string };
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
    teacher: schedule.teacher.user.name,
    room: schedule.classroom.name,
    section,
    course: section
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
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastAccess: new Date().toISOString(),
      courses: sections.map((section) => ({
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        classroom: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.length
      })),
      subjects: Array.from(subjectMap.values()),
      linkedStudents: profile?.guardian?.students.map((item) => ({ id: item.student.id, name: item.student.user.name, relationship: item.relationship })) ?? []
    };
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
