import { prisma } from '../../config/db.js';

const requestInclude = {
  requester: true,
  type: true,
  comments: { include: { author: true }, orderBy: { createdAt: 'asc' as const } },
  statusLogs: { include: { changedBy: true }, orderBy: { createdAt: 'asc' as const } }
};

export class RequestRepository {
  listAll() {
    return prisma.schoolRequest.findMany({ include: { requester: true, type: true, _count: { select: { comments: true } } }, orderBy: { createdAt: 'desc' } });
  }

  listByRequester(requesterId: string) {
    return prisma.schoolRequest.findMany({ where: { requesterId }, include: { requester: true, type: true, _count: { select: { comments: true } } }, orderBy: { createdAt: 'desc' } });
  }

  getById(id: string) {
    return prisma.schoolRequest.findUnique({ where: { id }, include: requestInclude });
  }

  async create(input: { subject: string; area: string; requesterId: string; description?: string; priority: string }) {
    const type = await prisma.requestType.upsert({
      where: { name: input.area },
      update: { area: input.area },
      create: { name: input.area, area: input.area }
    });

    return prisma.schoolRequest.create({
      data: { subject: input.subject, description: input.description, priority: input.priority, requesterId: input.requesterId, typeId: type.id },
      include: { requester: true, type: true, _count: { select: { comments: true } } }
    });
  }

  updateStatus(id: string, fromStatus: string, toStatus: string, changedById: string) {
    return prisma.$transaction(async (tx) => {
      await tx.requestStatusLog.create({ data: { requestId: id, changedById, fromStatus, toStatus } });
      return tx.schoolRequest.update({
        where: { id },
        data: { status: toStatus, closedAt: ['resuelto', 'cerrado', 'rechazado'].includes(toStatus) ? new Date() : null },
        include: { requester: true, type: true, _count: { select: { comments: true } } }
      });
    });
  }

  addComment(requestId: string, authorId: string, body: string) {
    return prisma.requestComment.create({ data: { requestId, authorId, body }, include: { author: true } });
  }

  listStatusLogs(requestId: string) {
    return prisma.requestStatusLog.findMany({ where: { requestId }, include: { changedBy: true }, orderBy: { createdAt: 'asc' } });
  }
}
