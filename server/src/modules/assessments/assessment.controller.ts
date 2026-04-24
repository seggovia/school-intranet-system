import type { Request, Response } from 'express';
import { AssessmentService } from './assessment.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new AssessmentService();

export class AssessmentController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create(req.user, req.body));
  }
}
