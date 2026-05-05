import type { Request, Response } from 'express';
import { GradeService } from './grade.service.js';
import { HttpError } from '../../shared/http-error.js';
import type { AuditContext } from '../audit/audit.service.js';

const service = new GradeService();

function auditContext(req: Request): AuditContext {
  const userAgent = req.headers['user-agent'];
  return {
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent
  };
}

export class GradeController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create(req.user, req.body));
  }

  async update(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.update(req.user, String(req.params.id), req.body));
  }

  async context(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.context(req.user));
  }

  async evaluations(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.evaluations(req.user, req.query as { sectionId?: string; subjectId?: string; periodId?: string }));
  }

  async createEvaluation(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createEvaluation(req.user, req.body));
  }

  async updateEvaluation(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateEvaluation(req.user, String(req.params.id), req.body));
  }

  async deleteEvaluation(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteEvaluation(req.user, String(req.params.id)));
  }

  async records(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.records(req.user, String(req.query.evaluationId), req.query.periodId ? String(req.query.periodId) : undefined));
  }

  async bulk(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.bulk(req.user, req.body, auditContext(req)));
  }

  async me(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.me(req.user));
  }

  async guardian(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.guardian(req.user));
  }

  async summary(_req: Request, res: Response) {
    res.json(await service.summary());
  }
}
