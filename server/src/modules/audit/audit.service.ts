import type { Prisma } from '@prisma/client';
import { HttpError } from '../../shared/http-error.js';
import { AuditRepository, type AuditLogInput } from './audit.repository.js';
import type { auditQuerySchema } from './audit.validators.js';
import type { z } from 'zod';

const repository = new AuditRepository();

export type AuditContext = {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Fecha de auditoria invalida.');
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
}

export class AuditService {
  log(input: Omit<AuditLogInput, 'metadata'> & { metadata?: Prisma.InputJsonValue }) {
    return repository.create(input);
  }

  async list(input: AuditQueryInput) {
    const page = input.page;
    const pageSize = input.pageSize;
    const { total, rows } = await repository.list({
      ...input,
      from: parseDate(input.from),
      to: parseDate(input.to, true)
    });
    return {
      rows: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        user: row.user ? { id: row.user.id, name: row.user.name, email: row.user.email, avatar: row.user.avatar } : null,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        description: row.description,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString()
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    };
  }
}
