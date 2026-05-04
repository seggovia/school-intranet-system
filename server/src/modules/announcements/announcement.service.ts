import { AnnouncementRepository } from './announcement.repository.js';
import { NotificationService } from '../notifications/notification.service.js';

const repository = new AnnouncementRepository();
const notifications = new NotificationService();

function serialize(item: Awaited<ReturnType<AnnouncementRepository['create']>>) {
  return {
    id: item.id,
    title: item.title,
    audience: item.audience,
    author: item.author.name,
    date: item.createdAt.toISOString().slice(0, 10),
    priority: item.priority,
    body: item.body
  };
}

export class AnnouncementService {
  async list() {
    const announcements = await repository.list();
    return announcements.map(serialize);
  }

  async create(input: { title: string; audience: string; priority: string; body: string; authorId: string }) {
    const created = await repository.create(input);
    await notifications.notifyAnnouncement({ title: created.title, audience: created.audience, authorId: input.authorId });
    return serialize(created);
  }
}
