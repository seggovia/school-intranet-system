import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { RequestService } from './request.service.js';
import type { AuditContext } from '../audit/audit.service.js';

const service = new RequestService();

function auditContext(req: Request): AuditContext {
  const userAgent = req.headers['user-agent'];
  return {
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent
  };
}

export class RequestController {
  async list(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.listForUser(req.user));
  }

  async detail(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.getDetail(req.user, String(req.params.id)));
  }

  async create(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create({ ...req.body, requesterId: req.user.id }));
  }

  async updateStatus(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateStatus(req.user, String(req.params.id), req.body.status, auditContext(req)));
  }

  async addComment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.addComment(req.user, String(req.params.id), req.body.body));
  }
}
