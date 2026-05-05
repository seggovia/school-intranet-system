import type { JwtUser } from '../auth/auth.types.js';
import { HttpError } from '../../shared/http-error.js';
import { NotificationService } from '../notifications/notification.service.js';
import { RequestRepository } from './request.repository.js';
import { requestStatusSchema } from './request.validators.js';
import { AuditService, type AuditContext } from '../audit/audit.service.js';

const repository = new RequestRepository();
const notifications = new NotificationService();
const auditService = new AuditService();

type RequestListItem = Awaited<ReturnType<RequestRepository['create']>>;
type RequestDetail = NonNullable<Awaited<ReturnType<RequestRepository['getById']>>>;

function canManage(user: JwtUser) {
  return user.roles.some((role) => ['admin', 'director', 'inspector'].includes(role));
}

function canAccess(user: JwtUser, request: { requesterId: string }) {
  return canManage(user) || request.requesterId === user.id;
}

function serialize(request: RequestListItem) {
  return {
    id: request.id,
    subject: request.subject,
    description: request.description,
    priority: request.priority,
    requester: request.requester.name,
    area: request.type.area,
    status: request.status,
    closedAt: request.closedAt?.toISOString() ?? null,
    commentsCount: request._count?.comments ?? 0,
    createdAt: request.createdAt.toISOString().slice(0, 10)
  };
}

function serializeDetail(request: RequestDetail) {
  return {
    id: request.id,
    subject: request.subject,
    description: request.description,
    priority: request.priority,
    requester: request.requester.name,
    area: request.type.area,
    status: request.status,
    closedAt: request.closedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString().slice(0, 10),
    comments: request.comments.map((comment) => ({
      id: comment.id,
      author: comment.author.name,
      body: comment.body,
      createdAt: comment.createdAt.toISOString()
    })),
    statusLogs: request.statusLogs.map((log) => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      changedBy: log.changedBy.name,
      createdAt: log.createdAt.toISOString()
    }))
  };
}

export class RequestService {
  private recordAudit(ctx: AuditContext | undefined, input: { action: string; entity: string; entityId: string; description: string; metadata?: Record<string, string> }) {
    return auditService.log({
      userId: ctx?.userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      ...input,
      metadata: input.metadata ?? {}
    }).catch(() => undefined);
  }

  async listForUser(user: JwtUser) {
    const canSeeAll = canManage(user) || user.permissions.includes('requests:manage');
    const requests = canSeeAll ? await repository.listAll() : await repository.listByRequester(user.id);
    return requests.map(serialize);
  }

  async getDetail(user: JwtUser, id: string) {
    const request = await repository.getById(id);
    if (!request) throw new HttpError(404, 'Solicitud no encontrada.');
    if (!canAccess(user, request)) throw new HttpError(403, 'No tienes permisos para ver esta solicitud.');
    return serializeDetail(request);
  }

  async create(input: { subject: string; area: string; requesterId: string; description?: string; priority: string }) {
    return serialize(await repository.create(input));
  }

  async updateStatus(user: JwtUser, id: string, status: string, ctx?: AuditContext) {
    const parsed = requestStatusSchema.safeParse(status);
    if (!parsed.success) throw new HttpError(400, 'Estado de solicitud invalido.');
    if (!canManage(user)) throw new HttpError(403, 'No tienes permisos para cambiar estados.');
    const current = await repository.getById(id);
    if (!current) throw new HttpError(404, 'Solicitud no encontrada.');
    const request = await repository.updateStatus(id, current.status, parsed.data, user.id);
    await notifications.notifyMany([request.requesterId], {
      title: 'Solicitud actualizada',
      message: `Tu solicitud "${request.subject}" cambio a ${parsed.data.replace(/_/g, ' ')}.`,
      type: 'request'
    });
    await this.recordAudit(ctx, {
      action: 'REQUEST_STATUS_CHANGED',
      entity: 'Request',
      entityId: id,
      description: `Solicitud "${request.subject}" cambio de ${current.status} a ${parsed.data}.`,
      metadata: { fromStatus: current.status, toStatus: parsed.data }
    });
    return serialize(request);
  }

  async addComment(user: JwtUser, id: string, body: string) {
    const request = await repository.getById(id);
    if (!request) throw new HttpError(404, 'Solicitud no encontrada.');
    if (!canAccess(user, request)) throw new HttpError(403, 'No tienes permisos para comentar esta solicitud.');
    const comment = await repository.addComment(id, user.id, body);
    return {
      id: comment.id,
      author: comment.author.name,
      body: comment.body,
      createdAt: comment.createdAt.toISOString()
    };
  }
}
