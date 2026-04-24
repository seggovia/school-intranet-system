import type { Request, Response } from 'express';
import { SubjectService } from './subject.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new SubjectService();

export class SubjectController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async detail(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.detail(req.user, String(req.params.id)));
  }
}
