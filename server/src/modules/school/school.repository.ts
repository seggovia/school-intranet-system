import { prisma } from '../../config/db.js';

export class SchoolRepository {
  countStudents() {
    return prisma.student.count();
  }

  listCourses() {
    return prisma.section.findMany({
      include: {
        course: true,
        classroom: true,
        headTeacher: { include: { user: true } },
        enrollments: {
          include: {
            student: { include: { grades: true, attendance: true } }
          }
        }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  listStudents() {
    return prisma.student.findMany({
      include: {
        user: true,
        guardians: { include: { guardian: { include: { user: true } } } },
        enrollments: {
          include: {
            section: { include: { course: true } },
            grades: true
          },
          where: { status: 'activo' },
          take: 1
        },
        attendance: true
      },
      orderBy: { user: { name: 'asc' } }
    });
  }

  listSubjects() {
    return prisma.subject.findMany({
      include: {
        teachers: { include: { teacher: { include: { user: true } } } },
        sections: { include: { section: { include: { course: true } } } }
      },
      orderBy: { name: 'asc' }
    });
  }

  listSchedules() {
    return prisma.classSchedule.findMany({
      include: {
        section: { include: { course: true } },
        subject: true,
        teacher: { include: { user: true } },
        classroom: true
      },
      orderBy: [{ weekday: 'asc' }, { startsAt: 'asc' }]
    });
  }

  listAssessments() {
    return prisma.assessment.findMany({
      include: { subject: true, grades: true },
      orderBy: { date: 'desc' }
    });
  }

  listAttendance() {
    return prisma.attendance.findMany({
      include: {
        student: { include: { user: true } },
        enrollment: { include: { section: { include: { course: true } } } }
      },
      orderBy: { date: 'desc' },
      take: 50
    });
  }

  listAnnouncements() {
    return prisma.announcement.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  listEvents() {
    return prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
  }

  listDocuments() {
    return prisma.document.findMany({
      include: { category: true, owner: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  listRequestTypes() {
    return prisma.requestType.findMany({ orderBy: { name: 'asc' } });
  }

  listRequests() {
    return prisma.schoolRequest.findMany({
      include: { requester: true, type: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createRequest(input: { subject: string; requesterId: string; area: string }) {
    const type = await prisma.requestType.upsert({
      where: { name: input.area },
      update: { area: input.area },
      create: { name: input.area, area: input.area }
    });

    return prisma.schoolRequest.create({
      data: { subject: input.subject, requesterId: input.requesterId, typeId: type.id },
      include: { requester: true, type: true }
    });
  }

  listNotifications(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
