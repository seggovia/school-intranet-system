import { prisma } from '../../config/db.js';

export class AttendanceRepository {
  list() {
    return prisma.attendance.findMany({
      include: { student: { include: { user: true } }, enrollment: { include: { section: { include: { course: true } } } } },
      orderBy: { date: 'desc' },
      take: 100
    });
  }

  create(input: { enrollmentId: string; studentId: string; date: Date; status: string; note?: string }) {
    return prisma.attendance.upsert({
      where: { studentId_date: { studentId: input.studentId, date: input.date } },
      update: { status: input.status, note: input.note, enrollmentId: input.enrollmentId },
      create: input,
      include: { student: { include: { user: true } }, enrollment: { include: { section: { include: { course: true } } } } }
    });
  }

  bulkCreate(input: { date: Date; records: { enrollmentId: string; studentId: string; status: string; note?: string }[] }) {
    return prisma.$transaction(input.records.map((record) => prisma.attendance.upsert({
      where: { studentId_date: { studentId: record.studentId, date: input.date } },
      update: { status: record.status, note: record.note, enrollmentId: record.enrollmentId },
      create: { ...record, date: input.date },
      include: { student: { include: { user: true } }, enrollment: { include: { section: { include: { course: true } } } } }
    })));
  }

  findEnrollmentScope(enrollmentId: string) {
    return prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { section: { include: { headTeacher: true } }, student: true }
    });
  }

  findById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: { student: { include: { user: true } }, enrollment: { include: { section: { include: { course: true, headTeacher: true } } } } }
    });
  }

  update(id: string, input: { status: string; note?: string }) {
    return prisma.attendance.update({
      where: { id },
      data: input,
      include: { student: { include: { user: true } }, enrollment: { include: { section: { include: { course: true } } } } }
    });
  }
}
