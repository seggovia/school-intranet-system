import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { RequestService } from './request.service.js';

const service = new RequestService();

export class RequestController {
  async list(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.listForUser(req.user));
  }

  async create(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create({ ...req.body, requesterId: req.user.id }));
  }

  async updateStatus(req: Request, res: Response) {
    res.json(await service.updateStatus(String(req.params.id), req.body.status));
  }
}
