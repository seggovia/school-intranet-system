import type { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new AttendanceService();

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
  return req.user;
}

export class AttendanceController {
  async context(req: Request, res: Response) {
    res.json(await service.context(requireUser(req)));
  }

  async records(req: Request, res: Response) {
    res.json(await service.records(requireUser(req), req.query as unknown as { sectionId: string; subjectId: string; date: Date }));
  }

  async bulk(req: Request, res: Response) {
    res.status(201).json(await service.bulk(requireUser(req), req.body));
  }

  async me(req: Request, res: Response) {
    res.json(await service.me(requireUser(req)));
  }

  async guardian(req: Request, res: Response) {
    res.json(await service.guardian(requireUser(req)));
  }

  async summary(_req: Request, res: Response) {
    res.json(await service.summary());
  }
}
