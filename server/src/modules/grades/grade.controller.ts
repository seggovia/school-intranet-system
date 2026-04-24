import type { Request, Response } from 'express';
import { GradeService } from './grade.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new GradeService();

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
}
