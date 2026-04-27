import { prisma } from '../../config/db.js';

const gradeInclude = {
  assessment: { include: { subject: true, section: { include: { course: true } } } },
  student: { include: { user: true } },
  enrollment: { include: { section: { include: { course: true } } } }
} as const;

const sectionContextInclude = {
  course: true,
  subjects: { include: { subject: true } },
  schedules: { include: { subject: true, teacher: { include: { user: true } } } },
  enrollments: {
    where: { status: 'activo' },
    include: { student: { include: { user: true } } },
    orderBy: { student: { user: { name: 'asc' } } }
  }
} as const;

export class GradeRepository {
  list() {
    return prisma.grade.findMany({
      include: gradeInclude,
      orderBy: { assessment: { date: 'desc' } }
    });
  }

  create(input: { assessmentId: string; studentId: string; enrollmentId: string; score: number; status?: string; comment?: string | null }) {
    return prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: input.assessmentId, studentId: input.studentId } },
      update: { score: input.score, enrollmentId: input.enrollmentId, status: input.status ?? 'con_nota', comment: input.comment },
      create: { ...input, status: input.status ?? 'con_nota' },
      include: gradeInclude
    });
  }

  findEnrollmentScope(enrollmentId: string) {
    return prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { section: { include: { headTeacher: true } }, student: true }
    });
  }

  findById(id: string) {
    return prisma.grade.findUnique({
      where: { id },
      include: gradeInclude
    });
  }

  update(id: string, input: { score: number }) {
    return prisma.grade.update({
      where: { id },
      data: input,
      include: gradeInclude
    });
  }

  listAllContext() {
    return prisma.section.findMany({ include: sectionContextInclude, orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }] });
  }

  listTeacherContext(userId: string) {
    return prisma.section.findMany({
      where: {
        OR: [
          { schedules: { some: { teacher: { userId } } } },
          { headTeacher: { userId } }
        ]
      },
      include: sectionContextInclude,
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  findSection(sectionId: string) {
    return prisma.section.findUnique({ where: { id: sectionId }, include: sectionContextInclude });
  }

  findSubjectSection(sectionId: string, subjectId: string) {
    return prisma.subjectSection.findUnique({ where: { sectionId_subjectId: { sectionId, subjectId } } });
  }

  findTeacherAssignment(userId: string, sectionId: string, subjectId: string) {
    return prisma.section.findFirst({
      where: {
        id: sectionId,
        subjects: { some: { subjectId } },
        OR: [
          { schedules: { some: { subjectId, teacher: { userId } } } },
          { headTeacher: { userId, subjects: { some: { subjectId } } } }
        ]
      }
    });
  }

  listEvaluations(input: { sectionId?: string; subjectId?: string }) {
    return prisma.assessment.findMany({
      where: { sectionId: input.sectionId, subjectId: input.subjectId },
      include: { subject: true, section: { include: { course: true } }, grades: true },
      orderBy: [{ date: 'desc' }, { title: 'asc' }]
    });
  }

  findEvaluation(id: string) {
    return prisma.assessment.findUnique({
      where: { id },
      include: { subject: true, section: { include: { course: true, enrollments: { where: { status: 'activo' }, include: { student: { include: { user: true } } } } } }, grades: { include: { student: { include: { user: true } }, enrollment: true } } }
    });
  }

  createEvaluation(input: { title: string; subjectId: string; sectionId: string; date: Date; weight: number; type: string; description?: string }) {
    return prisma.assessment.create({ data: input, include: { subject: true, section: { include: { course: true } }, grades: true } });
  }

  updateEvaluation(id: string, input: Partial<{ title: string; subjectId: string; sectionId: string; date: Date; weight: number; type: string; description?: string | null }>) {
    return prisma.assessment.update({ where: { id }, data: input, include: { subject: true, section: { include: { course: true } }, grades: true } });
  }

  deleteEvaluation(id: string) {
    return prisma.assessment.delete({ where: { id } });
  }

  bulkUpsert(input: { evaluationId: string; records: Array<{ enrollmentId: string; studentId: string; status: string; score?: number | null; comment?: string | null }> }) {
    return prisma.$transaction(input.records.map((record) => prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: input.evaluationId, studentId: record.studentId } },
      update: { enrollmentId: record.enrollmentId, status: record.status, score: record.score ?? null, comment: record.comment },
      create: { assessmentId: input.evaluationId, enrollmentId: record.enrollmentId, studentId: record.studentId, status: record.status, score: record.score ?? null, comment: record.comment },
      include: gradeInclude
    })));
  }

  findStudentByUser(userId: string) {
    return prisma.student.findUnique({
      where: { userId },
      include: { user: true, grades: { include: gradeInclude, orderBy: { assessment: { date: 'desc' } } } }
    });
  }

  findGuardianByUser(userId: string) {
    return prisma.guardian.findUnique({
      where: { userId },
      include: { students: { include: { student: { include: { user: true, grades: { include: gradeInclude, orderBy: { assessment: { date: 'desc' } } } } } } } }
    });
  }

  listSummary() {
    return prisma.section.findMany({
      include: {
        course: true,
        enrollments: { where: { status: 'activo' }, include: { student: { include: { user: true, grades: { include: { assessment: { include: { subject: true } } } } } } } },
        assessments: { include: { subject: true, section: { include: { course: true } }, grades: true }, orderBy: { date: 'desc' } }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }
}
