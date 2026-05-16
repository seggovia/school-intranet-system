import type { Response } from 'express';
import { NotificationRepository } from './notification.repository.js';

const repository = new NotificationRepository();

type NotificationRow = Awaited<ReturnType<NotificationRepository['create']>>;

function serializeNotification(item: NotificationRow) {
  return {
    id: item.id,
    userId: item.userId,
    title: item.title,
    message: item.message,
    type: item.type,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString()
  };
}

class NotificationStreamManager {
  private connections = new Map<string, Set<Response>>();

  connect(userId: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    const userConnections = this.connections.get(userId) ?? new Set<Response>();
    userConnections.add(res);
    this.connections.set(userId, userConnections);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': heartbeat\n\n');
    }, 30000);

    res.on('close', () => {
      clearInterval(heartbeat);
      this.remove(userId, res);
    });
  }

  push(userId: string, payload: ReturnType<typeof serializeNotification>) {
    const userConnections = this.connections.get(userId);
    if (!userConnections?.size) return;
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of userConnections) {
      if (res.writableEnded) this.remove(userId, res);
      else res.write(message);
    }
  }

  closeAll() {
    for (const connections of this.connections.values()) {
      for (const res of connections) {
        if (!res.writableEnded) res.end();
      }
    }
    this.connections.clear();
  }

  connectionCount() {
    return Array.from(this.connections.values()).reduce((total, connections) => total + connections.size, 0);
  }

  private remove(userId: string, res: Response) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;
    userConnections.delete(res);
    if (!userConnections.size) this.connections.delete(userId);
  }
}

export const NotificationStream = new NotificationStreamManager();

export class NotificationService {
  async listForUser(userId: string) {
    const rows = await repository.listForUser(userId);
    return {
      unreadCount: rows.filter((item) => !item.readAt).length,
      notifications: rows.map(serializeNotification)
    };
  }

  async create(input: { userId: string; title: string; message: string; type?: string }) {
    const notification = await repository.create(input);
    NotificationStream.push(notification.userId, serializeNotification(notification));
    return notification;
  }

  async createMany(inputs: Array<{ userId: string; title: string; message: string; type?: string }>) {
    const notifications = await repository.createManyWithRows(inputs);
    notifications.forEach((notification) => {
      NotificationStream.push(notification.userId, serializeNotification(notification));
    });
    return { count: notifications.length };
  }

  async notifyMany(userIds: string[], input: { title: string; message: string; type?: string }) {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    return this.createMany(unique.map((userId) => ({ userId, ...input })));
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

  stream(userId: string, res: Response) {
    NotificationStream.connect(userId, res);
  }
}
