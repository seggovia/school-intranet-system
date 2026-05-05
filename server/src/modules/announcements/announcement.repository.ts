import { prisma } from '../../config/db.js';

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function audienceRoles(audience: string) {
  const normalized = normalize(audience);
  const roleNames = new Set<string>();
  if (normalized.includes('toda') || normalized.includes('comunidad')) ['admin', 'director', 'teacher', 'student', 'guardian', 'inspector'].forEach((role) => roleNames.add(role));
  if (normalized.includes('docente') || normalized.includes('profesor')) roleNames.add('teacher');
  if (normalized.includes('estudiante')) roleNames.add('student');
  if (normalized.includes('familia') || normalized.includes('apoderado')) roleNames.add('guardian');
  if (!roleNames.size) ['admin', 'director', 'inspector'].forEach((role) => roleNames.add(role));
  return Array.from(roleNames);
}

export class AnnouncementRepository {
  list() {
    return prisma.announcement.findMany({ include: { author: true, _count: { select: { reads: true } } }, orderBy: { createdAt: 'desc' } });
  }

  create(input: { title: string; audience: string; priority: string; body: string; authorId: string }) {
    return prisma.announcement.create({ data: input, include: { author: true, _count: { select: { reads: true } } } });
  }

  findById(id: string) {
    return prisma.announcement.findUnique({ where: { id }, include: { author: true, _count: { select: { reads: true } } } });
  }

  markRead(userId: string, announcementId: string) {
    return prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: { readAt: new Date() }
    });
  }

  getReadStatus(userId: string, announcementIds: string[]) {
    return prisma.announcementRead.findMany({
      where: { userId, announcementId: { in: announcementIds } },
      select: { announcementId: true, readAt: true }
    });
  }

  countReads(announcementId: string) {
    return prisma.announcementRead.count({ where: { announcementId } });
  }

  countAudience(audience: string) {
    return prisma.user.count({
      where: {
        isActive: true,
        roles: { some: { role: { name: { in: audienceRoles(audience) } } } }
      }
    });
  }
}
