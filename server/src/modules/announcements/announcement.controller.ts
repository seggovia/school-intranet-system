import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { AnnouncementService } from './announcement.service.js';

const service = new AnnouncementService();

export class AnnouncementController {
  async list(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.list(req.user));
  }

  async create(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create({ ...req.body, authorId: req.user.id }));
  }

  async markRead(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.markRead(req.user, String(req.params.id)));
  }
}
