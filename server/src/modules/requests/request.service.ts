import type { JwtUser } from '../auth/auth.types.js';
import { RequestRepository } from './request.repository.js';

const repository = new RequestRepository();

function serialize(request: Awaited<ReturnType<RequestRepository['create']>>) {
  return {
    id: request.id,
    subject: request.subject,
    requester: request.requester.name,
    area: request.type.area,
    status: request.status,
    createdAt: request.createdAt.toISOString().slice(0, 10)
  };
}

export class RequestService {
  async listForUser(user: JwtUser) {
    const canSeeAll = user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role)) || user.permissions.includes('requests:manage');
    const requests = canSeeAll ? await repository.listAll() : await repository.listByRequester(user.id);
    return requests.map(serialize);
  }

  async create(input: { subject: string; area: string; requesterId: string }) {
    return serialize(await repository.create(input));
  }

  async updateStatus(id: string, status: string) {
    return serialize(await repository.updateStatus(id, status));
  }
}
