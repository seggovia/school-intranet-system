import { SchoolRepository } from './school.repository.js';

const repository = new SchoolRepository();

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

export class SchoolService {
  async dashboard() {
    const [studentCount, courses, students] = await Promise.all([
      repository.countStudents(),
      repository.listCourses(),
      repository.listStudents()
    ]);
    const courseAttendance = courses.map((section) => attendanceRate(section.enrollments.flatMap((enrollment) => enrollment.student.attendance)));
    const gradeValues = students.flatMap((student) => student.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.score)));
    const atRisk = students.filter((student) => attendanceRate(student.attendance) < 85 || average(student.enrollments.flatMap((enrollment) => enrollment.grades.map((grade) => grade.score))) < 4.5).length;

    return {
      kpis: [
        { label: 'Matricula activa', value: studentCount, trend: 'Base 2026', tone: 'positive' },
        { label: 'Asistencia promedio', value: `${average(courseAttendance)}%`, trend: 'Ultimos registros', tone: 'warning' },
        { label: 'Promedio institucional', value: average(gradeValues), trend: 'Evaluaciones cargadas', tone: 'positive' },
        { label: 'Alertas prioritarias', value: atRisk, trend: 'Riesgo academico/asistencia', tone: 'critical' }
      ],
      attendanceSeries: [
        { month: 'Mar', asistencia: 93, atrasos: 41 },
        { month: 'Abr', asistencia: 91, atrasos: 55 },
        { month: 'May', asistencia: 94, atrasos: 37 },
        { month: 'Jun', asistencia: 90, atrasos: 61 },
        { month: 'Jul', asistencia: 95, atrasos: 28 }
      ],
      gradeSeries: [
        { subject: 'Lenguaje', promedio: 5.9 },
        { subject: 'Matematica', promedio: average(gradeValues) || 5.6 },
        { subject: 'Ciencias', promedio: 6.1 },
        { subject: 'Historia', promedio: 5.8 },
        { subject: 'Ingles', promedio: 6.0 }
      ]
    };
  }

  async courses() {
    const sections = await repository.listCourses();
    return sections.map((section) => {
      const grades = section.enrollments.flatMap((enrollment) => enrollment.student.grades.map((grade) => grade.score));
      const attendance = section.enrollments.flatMap((enrollment) => enrollment.student.attendance);
      return {
        id: section.id,
        name: `${section.course.name} ${section.name}`,
        teacher: section.headTeacher?.user.name ?? 'Sin profesor jefe',
        room: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.length,
        attendance: attendanceRate(attendance),
        average: average(grades)
      };
    });
  }

  async students() {
    const students = await repository.listStudents();
    return students.map((student) => {
      const enrollment = student.enrollments[0];
      const grades = enrollment?.grades.map((grade) => grade.score) ?? [];
      const studentAverage = average(grades);
      const studentAttendance = attendanceRate(student.attendance);
      const risk = studentAttendance < 85 || studentAverage < 4.5 ? 'alto' : studentAttendance < 90 || studentAverage < 5 ? 'medio' : 'bajo';

      return {
        id: student.id,
        name: student.user.name,
        course: enrollment ? `${enrollment.section.course.name} ${enrollment.section.name}` : 'Sin matricula',
        guardian: student.guardians[0]?.guardian.user.name ?? 'Sin apoderado',
        attendance: studentAttendance,
        average: studentAverage,
        risk
      };
    });
  }

  async subjects() {
    const subjects = await repository.listSubjects();
    return subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      teachers: subject.teachers.map((item) => item.teacher.user.name),
      sections: subject.sections.map((item) => `${item.section.course.name} ${item.section.name}`)
    }));
  }

  async schedules() {
    const schedules = await repository.listSchedules();
    return schedules.map((schedule) => ({
      id: schedule.id,
      course: `${schedule.section.course.name} ${schedule.section.name}`,
      subject: schedule.subject.name,
      teacher: schedule.teacher.user.name,
      classroom: schedule.classroom.name,
      weekday: schedule.weekday,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt
    }));
  }

  async attendance() {
    const attendance = await repository.listAttendance();
    return attendance.map((item) => ({
      id: item.id,
      student: item.student.user.name,
      course: `${item.enrollment.section.course.name} ${item.enrollment.section.name}`,
      date: item.date.toISOString().slice(0, 10),
      status: item.status,
      note: item.note
    }));
  }

  async assessments() {
    const assessments = await repository.listAssessments();
    return assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      subject: assessment.subject.name,
      date: assessment.date.toISOString().slice(0, 10),
      weight: assessment.weight,
      grades: assessment.grades.length
    }));
  }

  async announcements() {
    const announcements = await repository.listAnnouncements();
    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      audience: announcement.audience,
      author: announcement.author.name,
      date: announcement.createdAt.toISOString().slice(0, 10),
      priority: announcement.priority,
      body: announcement.body
    }));
  }

  async events() {
    const events = await repository.listEvents();
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.toISOString().slice(0, 10),
      type: event.type,
      location: event.location
    }));
  }

  async documents() {
    const documents = await repository.listDocuments();
    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      category: document.category.name,
      owner: document.owner.name,
      updatedAt: document.updatedAt.toISOString().slice(0, 10),
      status: document.status
    }));
  }

  async requests() {
    const requests = await repository.listRequests();
    return requests.map((request) => ({
      id: request.id,
      subject: request.subject,
      requester: request.requester.name,
      area: request.type.area,
      status: request.status,
      createdAt: request.createdAt.toISOString().slice(0, 10)
    }));
  }

  async createRequest(input: { subject: string; requesterId: string; area: string }) {
    const request = await repository.createRequest(input);
    return {
      id: request.id,
      subject: request.subject,
      requester: request.requester.name,
      area: request.type.area,
      status: request.status,
      createdAt: request.createdAt.toISOString().slice(0, 10)
    };
  }

  notifications(userId: string) {
    return repository.listNotifications(userId);
  }
}
