import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { AnnouncementService } from './announcement.service.js';

const service = new AnnouncementService();

export class AnnouncementController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create({ ...req.body, authorId: req.user.id }));
  }
}
