import { prisma } from '../../config/db.js';

const observationInclude = {
  student: { include: { user: true } },
  author: true,
  section: { include: { course: true } }
} as const;

export class ObservationRepository {
  list(input: { studentId?: string; sectionId?: string; visibleOnly?: boolean }) {
    return prisma.studentObservation.findMany({
      where: {
        studentId: input.studentId,
        sectionId: input.sectionId,
        isVisible: input.visibleOnly ? true : undefined
      },
      include: observationInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });
  }

  listVisibleForStudentIds(studentIds: string[]) {
    if (!studentIds.length) return Promise.resolve([]);
    return prisma.studentObservation.findMany({
      where: { studentId: { in: studentIds }, isVisible: true },
      include: observationInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 12
    });
  }

  create(input: { studentId: string; authorId: string; sectionId?: string; body: string; type: string; date: Date; isVisible: boolean }) {
    return prisma.studentObservation.create({
      data: input,
      include: observationInclude
    });
  }

  findById(id: string) {
    return prisma.studentObservation.findUnique({
      where: { id },
      include: observationInclude
    });
  }

  delete(id: string) {
    return prisma.studentObservation.delete({ where: { id } });
  }

  findStudentScope(studentId: string) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        enrollments: { where: { status: 'activo' }, include: { section: { include: { course: true, headTeacher: true, schedules: { where: { isActive: true }, include: { teacher: true } } } } } }
      }
    });
  }
}
