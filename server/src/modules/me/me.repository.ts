import { prisma } from '../../config/db.js';
import type { UserPreferencesInput } from './me.validators.js';

export class MeRepository {
  findUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        passwordResetTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
        teacher: true,
        student: { include: { enrollments: { include: { section: { include: { course: true } } } }, guardians: { include: { guardian: { include: { user: true } } } }, grades: true, attendance: true } },
        guardian: { include: { students: { include: { student: { include: { user: true } } } } } }
      }
    });
  }

  findUserForPassword(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  }

  updateProfile(userId: string, input: { name: string; avatar: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: input,
      select: { id: true, name: true, email: true, avatar: true, department: true, isActive: true }
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash }, select: { id: true } });
  }

  findTeacherSections(userId: string) {
    return prisma.section.findMany({
      where: {
        OR: [
          { headTeacher: { userId } },
          { schedules: { some: { teacher: { userId }, isActive: true } } }
        ]
      },
      include: {
        course: { include: { level: true } },
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
        course: { include: { level: true } },
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
        course: { include: { level: true } },
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
        course: { include: { level: true } },
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

  updatePreferences(userId: string, preferences: UserPreferencesInput) {
    return prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: { id: true, preferences: true }
    });
  }
}
