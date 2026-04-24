import { prisma } from '../../config/db.js';

export class RequestRepository {
  listAll() {
    return prisma.schoolRequest.findMany({ include: { requester: true, type: true }, orderBy: { createdAt: 'desc' } });
  }

  listByRequester(requesterId: string) {
    return prisma.schoolRequest.findMany({ where: { requesterId }, include: { requester: true, type: true }, orderBy: { createdAt: 'desc' } });
  }

  async create(input: { subject: string; area: string; requesterId: string }) {
    const type = await prisma.requestType.upsert({
      where: { name: input.area },
      update: { area: input.area },
      create: { name: input.area, area: input.area }
    });

    return prisma.schoolRequest.create({
      data: { subject: input.subject, requesterId: input.requesterId, typeId: type.id },
      include: { requester: true, type: true }
    });
  }

  updateStatus(id: string, status: string) {
    return prisma.schoolRequest.update({ where: { id }, data: { status }, include: { requester: true, type: true } });
  }
}
