import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { MeService } from './me.service.js';

const service = new MeService();

export class MeController {
  async dashboard(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.dashboard(req.user));
  }

  async subjects(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.subjects(req.user));
  }

  async schedule(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.schedule(req.user));
  }

  async grades(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.grades(req.user));
  }

  async attendance(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.attendance(req.user));
  }
}
