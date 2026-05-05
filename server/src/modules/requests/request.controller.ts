import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { RequestService } from './request.service.js';

const service = new RequestService();

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
    res.json(await service.updateStatus(req.user, String(req.params.id), req.body.status));
  }

  async addComment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.addComment(req.user, String(req.params.id), req.body.body));
  }
}
