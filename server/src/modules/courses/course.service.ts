import { CourseRepository } from './course.repository.js';

const repository = new CourseRepository();

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

export class CourseService {
  async list() {
    const sections = await repository.list();
    return sections.map((section) => {
      const grades = section.enrollments.flatMap((enrollment) => enrollment.student.grades.map((grade) => grade.score));
      const attendance = section.enrollments.flatMap((enrollment) => enrollment.student.attendance);
      return {
        id: section.id,
        courseId: section.courseId,
        name: `${section.course.name} ${section.name}`,
        level: section.course.level.name,
        teacher: section.headTeacher?.user.name ?? 'Sin asignar',
        room: section.classroom?.name ?? 'Sin sala',
        students: section.enrollments.length,
        attendance: attendanceRate(attendance),
        average: average(grades)
      };
    });
  }

  async create(input: { name: string; levelName: string; levelOrder: number }) {
    const course = await repository.create(input);
    return { id: course.id, name: course.name, level: course.level.name };
  }
}
