import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';

type Tx = Prisma.TransactionClient;

export type AuditLogInput = {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditLogFilters = {
  page: number;
  pageSize: number;
  userId?: string;
  action?: string;
  entity?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

export class AuditRepository {
  create(input: AuditLogInput, tx?: Tx) {
    const client = tx ?? prisma;
    return client.auditLog.create({ data: input });
  }

  async list(input: AuditLogFilters) {
    const where: Prisma.AuditLogWhereInput = {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      createdAt: input.from || input.to ? { gte: input.from, lte: input.to } : undefined,
      OR: input.search ? [
        { action: { contains: input.search } },
        { entity: { contains: input.search } },
        { entityId: { contains: input.search } },
        { description: { contains: input.search } },
        { user: { name: { contains: input.search } } },
        { user: { email: { contains: input.search } } }
      ] : undefined
    };

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      })
    ]);
    return { total, rows };
  }
}
