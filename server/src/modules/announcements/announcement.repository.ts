import { prisma } from '../../config/db.js';

export class AnnouncementRepository {
  list() {
    return prisma.announcement.findMany({ include: { author: true }, orderBy: { createdAt: 'desc' } });
  }

  create(input: { title: string; audience: string; priority: string; body: string; authorId: string }) {
    return prisma.announcement.create({ data: input, include: { author: true } });
  }
}
