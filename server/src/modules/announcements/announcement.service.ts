import { AnnouncementRepository } from './announcement.repository.js';

const repository = new AnnouncementRepository();

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
    return serialize(await repository.create(input));
  }
}
