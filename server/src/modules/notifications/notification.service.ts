import { NotificationRepository } from './notification.repository.js';

const repository = new NotificationRepository();

export class NotificationService {
  async listForUser(userId: string) {
    const rows = await repository.listForUser(userId);
    return {
      unreadCount: rows.filter((item) => !item.readAt).length,
      notifications: rows.map((item) => ({
        id: item.id,
        userId: item.userId,
        title: item.title,
        message: item.message,
        type: item.type,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }

  create(input: { userId: string; title: string; message: string; type?: string }) {
    return repository.create(input);
  }

  notifyMany(userIds: string[], input: { title: string; message: string; type?: string }) {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    return repository.createMany(unique.map((userId) => ({ userId, ...input })));
  }

  async notifyAnnouncement(input: { title: string; audience: string; authorId: string }) {
    const users = await repository.usersForAnnouncementAudience(input.audience);
    const recipients = users.map((user) => user.id).filter((id) => id !== input.authorId);
    return this.notifyMany(recipients, {
      title: 'Nuevo comunicado',
      message: `${input.title} fue publicado para ${input.audience}.`,
      type: 'announcement'
    });
  }

  async notifyStudentNetwork(studentId: string, input: { title: string; message: string; type: string }) {
    const student = await repository.studentRecipients(studentId);
    if (!student) return { count: 0 };
    const recipients = [student.userId, ...student.guardians.map((item) => item.guardian.userId)];
    return this.notifyMany(recipients, input);
  }

  markRead(userId: string, id: string) {
    return repository.markRead({ userId, id }).then(() => ({ ok: true }));
  }

  markAllRead(userId: string) {
    return repository.markAllRead(userId).then((result) => ({ ok: true, count: result.count }));
  }
}
