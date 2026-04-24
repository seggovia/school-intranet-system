import { GradeRepository } from './grade.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new GradeRepository();

function serialize(grade: Awaited<ReturnType<GradeRepository['create']>>) {
  return {
    id: grade.id,
    student: grade.student.user.name,
    course: `${grade.enrollment.section.course.name} ${grade.enrollment.section.name}`,
    subject: grade.assessment.subject.name,
    assessment: grade.assessment.title,
    score: grade.score
  };
}

export class GradeService {
  async list() {
    const grades = await repository.list();
    return grades.map(serialize);
  }

  private async assertCanWrite(user: JwtUser, enrollmentId: string) {
    if (user.roles.some((role) => ['admin', 'director'].includes(role))) return;
    const enrollment = await repository.findEnrollmentScope(enrollmentId);
    if (user.roles.includes('teacher') && enrollment?.section.headTeacher?.userId === user.id) return;
    throw new HttpError(403, 'No tienes permisos para modificar calificaciones de este curso.');
  }

  async create(user: JwtUser, input: { assessmentId: string; studentId: string; enrollmentId: string; score: number }) {
    await this.assertCanWrite(user, input.enrollmentId);
    return serialize(await repository.create(input));
  }

  async update(user: JwtUser, id: string, input: { score: number }) {
    const grade = await repository.findById(id);
    if (!grade) throw new HttpError(404, 'Calificacion no encontrada.');
    await this.assertCanWrite(user, grade.enrollmentId);
    return serialize(await repository.update(id, input));
  }
}
