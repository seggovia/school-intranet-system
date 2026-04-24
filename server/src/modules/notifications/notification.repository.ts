import { prisma } from '../../config/db.js';

export class NotificationRepository {
  listForUser(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(input: { userId: string; title: string; body: string }) {
    return prisma.notification.create({ data: input });
  }
}
