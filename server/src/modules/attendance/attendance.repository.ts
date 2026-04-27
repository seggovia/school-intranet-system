import { prisma } from '../../config/db.js';

const sectionInclude = {
  course: true,
  subjects: { include: { subject: true } },
  schedules: { include: { subject: true, teacher: { include: { user: true } } } },
  enrollments: {
    where: { status: 'activo' },
    include: { student: { include: { user: true } } },
    orderBy: { student: { user: { name: 'asc' } } }
  }
} as const;

export class AttendanceRepository {
  listAllContext() {
    return prisma.section.findMany({ include: sectionInclude, orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }] });
  }

  listTeacherContext(userId: string) {
    return prisma.section.findMany({
      where: { schedules: { some: { teacher: { userId } } } },
      include: sectionInclude,
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  findSection(sectionId: string) {
    return prisma.section.findUnique({ where: { id: sectionId }, include: sectionInclude });
  }

  findSubjectSection(sectionId: string, subjectId: string) {
    return prisma.subjectSection.findUnique({ where: { sectionId_subjectId: { sectionId, subjectId } } });
  }

  findTeacherAssignment(userId: string, sectionId: string, subjectId: string) {
    return prisma.classSchedule.findFirst({ where: { sectionId, subjectId, teacher: { userId } } });
  }

  findRecords(input: { sectionId: string; subjectId: string; date: Date }) {
    return prisma.attendance.findMany({
      where: input,
      include: { student: { include: { user: true } }, subject: true, section: { include: { course: true } } }
    });
  }

  bulkUpsert(input: { sectionId: string; subjectId: string; date: Date; userId: string; records: Array<{ enrollmentId: string; studentId: string; status: string; note?: string }> }) {
    return prisma.$transaction(input.records.map((record) => prisma.attendance.upsert({
      where: { studentId_subjectId_sectionId_date: { studentId: record.studentId, subjectId: input.subjectId, sectionId: input.sectionId, date: input.date } },
      update: { status: record.status, note: record.note, updatedById: input.userId },
      create: { enrollmentId: record.enrollmentId, studentId: record.studentId, subjectId: input.subjectId, sectionId: input.sectionId, date: input.date, status: record.status, note: record.note, recordedById: input.userId, updatedById: input.userId },
      include: { student: { include: { user: true } }, subject: true, section: { include: { course: true } } }
    })));
  }

  findStudentByUser(userId: string) {
    return prisma.student.findUnique({ where: { userId }, include: { attendance: { include: { subject: true, section: { include: { course: true } } }, orderBy: { date: 'desc' } } } });
  }

  findGuardianByUser(userId: string) {
    return prisma.guardian.findUnique({
      where: { userId },
      include: { students: { include: { student: { include: { user: true, attendance: { include: { subject: true, section: { include: { course: true } } }, orderBy: { date: 'desc' } } } } } } }
    });
  }

  listSummary(date: Date) {
    return prisma.section.findMany({
      include: {
        course: true,
        enrollments: { where: { status: 'activo' } },
        attendance: { where: { date }, include: { subject: true } }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }
}
