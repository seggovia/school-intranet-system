import { prisma } from '../../config/db.js';

export class MeRepository {
  findUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        teacher: true,
        student: { include: { enrollments: { include: { section: { include: { course: true } } } } } },
        guardian: { include: { students: { include: { student: { include: { user: true } } } } } }
      }
    });
  }

  findTeacherSections(userId: string) {
    return prisma.section.findMany({
      where: { headTeacher: { userId } },
      include: {
        course: true,
        classroom: true,
        headTeacher: { include: { user: true } },
        subjects: { include: { subject: { include: { assessments: { include: { grades: true } } } } } },
        schedules: { where: { isActive: true }, include: { subject: true, classroom: true, teacher: { include: { user: true } } } },
        enrollments: { include: { student: { include: { user: true, grades: { include: { assessment: { include: { subject: true } } } }, attendance: true } } } }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  findStudentSections(userId: string) {
    return prisma.section.findMany({
      where: { enrollments: { some: { student: { userId }, status: 'activo' } } },
      include: {
        course: true,
        classroom: true,
        headTeacher: { include: { user: true } },
        subjects: { include: { subject: { include: { assessments: { include: { grades: true } } } } } },
        schedules: { where: { isActive: true }, include: { subject: true, classroom: true, teacher: { include: { user: true } } } },
        enrollments: { where: { student: { userId } }, include: { student: { include: { user: true, grades: { include: { assessment: { include: { subject: true } } } }, attendance: true } } } }
      }
    });
  }

  findGuardianStudentSections(userId: string) {
    return prisma.section.findMany({
      where: { enrollments: { some: { student: { guardians: { some: { guardian: { userId } } } }, status: 'activo' } } },
      include: {
        course: true,
        classroom: true,
        headTeacher: { include: { user: true } },
        subjects: { include: { subject: { include: { assessments: { include: { grades: true } } } } } },
        schedules: { where: { isActive: true }, include: { subject: true, classroom: true, teacher: { include: { user: true } } } },
        enrollments: {
          where: { student: { guardians: { some: { guardian: { userId } } } } },
          include: { student: { include: { user: true, grades: { include: { assessment: { include: { subject: true } } } }, attendance: true } } }
        }
      }
    });
  }

  listAllSections() {
    return prisma.section.findMany({
      include: {
        course: true,
        classroom: true,
        headTeacher: { include: { user: true } },
        subjects: { include: { subject: { include: { assessments: { include: { grades: true } } } } } },
        schedules: { where: { isActive: true }, include: { subject: true, classroom: true, teacher: { include: { user: true } } } },
        enrollments: { include: { student: { include: { user: true, grades: { include: { assessment: { include: { subject: true } } } }, attendance: true } } } }
      },
      orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });
  }

  listAnnouncements() {
    return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  }

  listDocuments() {
    return prisma.document.findMany({ include: { category: true, owner: true }, orderBy: { updatedAt: 'desc' }, take: 20 });
  }
}
