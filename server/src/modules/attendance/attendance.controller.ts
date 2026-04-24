import type { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new AttendanceService();

export class AttendanceController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create(req.user, req.body));
  }

  async bulkCreate(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.bulkCreate(req.user, req.body));
  }

  async update(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.update(req.user, String(req.params.id), req.body));
  }
}
