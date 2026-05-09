import { prisma } from '../../config/db.js';

export class ReportsRepository {
  findPeriod(periodId: string) {
    return prisma.academicPeriod.findUnique({ where: { id: periodId } });
  }

  findStudentReportData(studentId: string, periodId?: string) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        guardians: { include: { guardian: true } },
        enrollments: {
          where: { status: 'activo' },
          include: {
            section: {
              include: {
                course: true,
                headTeacher: { include: { user: true } },
                schedules: { where: { isActive: true }, include: { teacher: true } }
              }
            }
          },
          orderBy: { year: 'desc' },
          take: 1
        },
        grades: {
          where: periodId ? { assessment: { periodId } } : undefined,
          include: { assessment: { include: { subject: true, period: true } } },
          orderBy: { assessment: { date: 'asc' } }
        },
        attendance: {
          include: { subject: true },
          orderBy: { date: 'desc' }
        }
      }
    });
  }

  findStudentByUser(userId: string) {
    return prisma.student.findUnique({ where: { userId }, select: { id: true } });
  }
}
