import { prisma } from '../../config/db.js';

export class GradeRepository {
  list() {
    return prisma.grade.findMany({
      include: {
        assessment: { include: { subject: true } },
        student: { include: { user: true } },
        enrollment: { include: { section: { include: { course: true } } } }
      },
      orderBy: { assessment: { date: 'desc' } }
    });
  }

  create(input: { assessmentId: string; studentId: string; enrollmentId: string; score: number }) {
    return prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: input.assessmentId, studentId: input.studentId } },
      update: { score: input.score, enrollmentId: input.enrollmentId },
      create: input,
      include: {
        assessment: { include: { subject: true } },
        student: { include: { user: true } },
        enrollment: { include: { section: { include: { course: true } } } }
      }
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
      include: {
        assessment: { include: { subject: true } },
        student: { include: { user: true } },
        enrollment: { include: { section: { include: { course: true, headTeacher: true } } } }
      }
    });
  }

  update(id: string, input: { score: number }) {
    return prisma.grade.update({
      where: { id },
      data: input,
      include: {
        assessment: { include: { subject: true } },
        student: { include: { user: true } },
        enrollment: { include: { section: { include: { course: true } } } }
      }
    });
  }
}
