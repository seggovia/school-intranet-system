import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { ObservationService } from './observation.service.js';

const service = new ObservationService();

export class ObservationController {
  async list(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.list(req.user, req.query as { studentId?: string; sectionId?: string }));
  }

  async create(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create(req.user, req.body));
  }

  async delete(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.delete(req.user, String(req.params.id)));
  }
}
