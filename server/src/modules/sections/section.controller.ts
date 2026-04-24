import type { Request, Response } from 'express';
import { SectionService } from './section.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new SectionService();

export class SectionController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async students(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.students(req.user, String(req.params.id)));
  }
}
