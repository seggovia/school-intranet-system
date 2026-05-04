import { prisma } from '../../config/db.js';

export class NotificationRepository {
  listForUser(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  create(input: { userId: string; title: string; message: string; type?: string }) {
    return prisma.notification.create({ data: input });
  }

  createMany(inputs: Array<{ userId: string; title: string; message: string; type?: string }>) {
    if (!inputs.length) return Promise.resolve({ count: 0 });
    return prisma.notification.createMany({ data: inputs, skipDuplicates: true });
  }

  markRead(input: { userId: string; id: string }) {
    return prisma.notification.updateMany({ where: { id: input.id, userId: input.userId, readAt: null }, data: { readAt: new Date() } });
  }

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  usersForAnnouncementAudience(audience: string) {
    const normalized = audience.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const roleNames = new Set<string>();
    if (normalized.includes('toda') || normalized.includes('comunidad')) ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'].forEach((role) => roleNames.add(role));
    if (normalized.includes('docente') || normalized.includes('profesor')) roleNames.add('teacher');
    if (normalized.includes('estudiante')) roleNames.add('student');
    if (normalized.includes('familia') || normalized.includes('apoderado')) roleNames.add('guardian');
    if (!roleNames.size) ['admin', 'director', 'inspector'].forEach((role) => roleNames.add(role));
    return prisma.user.findMany({
      where: { isActive: true, roles: { some: { role: { name: { in: Array.from(roleNames) } } } } },
      select: { id: true }
    });
  }

  studentRecipients(studentId: string) {
    return prisma.student.findUnique({
      where: { id: studentId },
      select: {
        userId: true,
        guardians: { select: { guardian: { select: { userId: true } } } }
      }
    });
  }
}
