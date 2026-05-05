import { AnnouncementRepository } from './announcement.repository.js';
import { NotificationService } from '../notifications/notification.service.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const repository = new AnnouncementRepository();
const notifications = new NotificationService();

type AnnouncementRecord = NonNullable<Awaited<ReturnType<AnnouncementRepository['findById']>>>;

async function serialize(item: AnnouncementRecord, read?: { readAt: Date } | null) {
  const readCount = item._count.reads;
  const totalAudienceSize = await repository.countAudience(item.audience);
  return {
    id: item.id,
    title: item.title,
    audience: item.audience,
    author: item.author.name,
    date: item.createdAt.toISOString().slice(0, 10),
    priority: item.priority,
    body: item.body,
    readByUser: Boolean(read),
    readAt: read?.readAt.toISOString() ?? null,
    readCount,
    readPercentage: totalAudienceSize ? Math.round((readCount / totalAudienceSize) * 100) : 0
  };
}

export class AnnouncementService {
  async list(user: JwtUser) {
    const announcements = await repository.list();
    const readStatuses = await repository.getReadStatus(user.id, announcements.map((item) => item.id));
    const readsByAnnouncement = new Map(readStatuses.map((item) => [item.announcementId, item]));
    return Promise.all(announcements.map((item) => serialize(item, readsByAnnouncement.get(item.id))));
  }

  async create(input: { title: string; audience: string; priority: string; body: string; authorId: string }) {
    const created = await repository.create(input);
    await notifications.notifyAnnouncement({ title: created.title, audience: created.audience, authorId: input.authorId });
    return serialize(created);
  }

  async markRead(user: JwtUser, id: string) {
    const announcement = await repository.findById(id);
    if (!announcement) throw new HttpError(404, 'Comunicado no encontrado.');
    const read = await repository.markRead(user.id, id);
    const readCount = await repository.countReads(id);
    return serialize({ ...announcement, _count: { reads: readCount } }, read);
  }
}
