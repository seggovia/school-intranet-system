import { SectionRepository } from './section.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new SectionRepository();

export class SectionService {
  async list() {
    const sections = await repository.list();
    return sections.map((section) => ({
      id: section.id,
      name: `${section.course.name} ${section.name}`,
      courseId: section.courseId,
      teacher: section.headTeacher?.user.name ?? 'Sin asignar',
      classroom: section.classroom?.name ?? 'Sin sala',
      students: section.enrollments.length
    }));
  }

  async create(input: { courseId: string; name: string; teacherId?: string; classroomId?: string }) {
    const section = await repository.create(input);
    return {
      id: section.id,
      name: `${section.course.name} ${section.name}`,
      courseId: section.courseId,
      teacher: section.headTeacher?.user.name ?? 'Sin asignar',
      classroom: section.classroom?.name ?? 'Sin sala'
    };
  }

  private async assertCanReadStudents(user: JwtUser, sectionId: string) {
    if (user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role))) return;
    const section = await repository.findSectionScope(sectionId);
    if (user.roles.includes('teacher') && section?.headTeacher?.userId === user.id) return;
    if (user.roles.includes('student') && section?.enrollments.some((enrollment) => enrollment.student.userId === user.id)) return;
    if (user.roles.includes('guardian') && section?.enrollments.some((enrollment) => enrollment.student.guardians.some((item) => item.guardian.userId === user.id))) return;
    throw new HttpError(403, 'No tienes permisos para ver estudiantes de este curso.');
  }

  async students(user: JwtUser, sectionId: string) {
    await this.assertCanReadStudents(user, sectionId);
    const enrollments = await repository.listStudents(sectionId);
    return enrollments.filter((enrollment) => {
      if (user.roles.some((role) => ['admin', 'director', 'inspector', 'teacher'].includes(role))) return true;
      if (user.roles.includes('student')) return enrollment.student.userId === user.id;
      return enrollment.student.guardians.some((item) => item.guardian.userId === user.id);
    }).map((enrollment) => ({
      id: enrollment.student.id,
      userId: enrollment.student.userId,
      enrollmentId: enrollment.id,
      name: enrollment.student.user.name,
      course: `${enrollment.section.course.name} ${enrollment.section.name}`,
      attendanceRecords: enrollment.student.attendance.length,
      grades: enrollment.student.grades.length
    }));
  }
}
