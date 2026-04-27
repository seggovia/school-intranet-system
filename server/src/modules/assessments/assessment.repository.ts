import { prisma } from '../../config/db.js';

export class AssessmentRepository {
  list() {
    return prisma.assessment.findMany({ include: { subject: true, section: { include: { course: true } }, grades: true }, orderBy: { date: 'desc' } });
  }

  create(input: { subjectId: string; sectionId: string; title: string; date: Date; weight: number }) {
    return prisma.assessment.create({ data: input, include: { subject: true, section: { include: { course: true } }, grades: true } });
  }

  findSubjectScope(subjectId: string) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      include: { sections: { include: { section: { include: { headTeacher: true } } } } }
    });
  }

  findFirstSubjectSection(subjectId: string) {
    return prisma.subjectSection.findFirst({ where: { subjectId }, orderBy: { section: { name: 'asc' } } });
  }
}
