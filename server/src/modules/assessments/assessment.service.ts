import { AssessmentRepository } from './assessment.repository.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new AssessmentRepository();

function serialize(assessment: Awaited<ReturnType<AssessmentRepository['create']>>) {
  return {
    id: assessment.id,
    title: assessment.title,
    subject: assessment.subject.name,
    section: `${assessment.section.course.name} ${assessment.section.name}`,
    date: assessment.date.toISOString().slice(0, 10),
    weight: assessment.weight,
    grades: assessment.grades.length
  };
}

export class AssessmentService {
  async list() {
    const assessments = await repository.list();
    return assessments.map(serialize);
  }

  async create(user: JwtUser, input: { subjectId: string; sectionId?: string; title: string; date: Date; weight: number }) {
    const sectionId = input.sectionId ?? (await repository.findFirstSubjectSection(input.subjectId))?.sectionId;
    if (!sectionId) throw new HttpError(400, 'La asignatura no tiene secciones asociadas.');
    if (!user.roles.some((role) => ['admin', 'director'].includes(role))) {
      const subject = await repository.findSubjectScope(input.subjectId);
      const assigned = user.roles.includes('teacher') && subject?.sections.some((item) => item.section.headTeacher?.userId === user.id);
      if (!assigned) throw new HttpError(403, 'No tienes permisos para crear evaluaciones en esta asignatura.');
    }
    return serialize(await repository.create({ ...input, sectionId }));
  }
}
