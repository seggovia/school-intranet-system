import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { NotificationService } from './notification.service.js';

const service = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.listForUser(req.user.id));
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }
}
