import { NotificationRepository } from './notification.repository.js';

const repository = new NotificationRepository();

export class NotificationService {
  listForUser(userId: string) {
    return repository.listForUser(userId);
  }

  create(input: { userId: string; title: string; body: string }) {
    return repository.create(input);
  }
}
