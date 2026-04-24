import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { SchoolService } from './school.service.js';

const service = new SchoolService();

export class SchoolController {
  async dashboard(_req: Request, res: Response) {
    res.json(await service.dashboard());
  }

  async courses(_req: Request, res: Response) {
    res.json(await service.courses());
  }

  async students(_req: Request, res: Response) {
    res.json(await service.students());
  }

  async subjects(_req: Request, res: Response) {
    res.json(await service.subjects());
  }

  async schedules(_req: Request, res: Response) {
    res.json(await service.schedules());
  }

  async attendance(_req: Request, res: Response) {
    res.json(await service.attendance());
  }

  async assessments(_req: Request, res: Response) {
    res.json(await service.assessments());
  }

  async announcements(_req: Request, res: Response) {
    res.json(await service.announcements());
  }

  async events(_req: Request, res: Response) {
    res.json(await service.events());
  }

  async documents(_req: Request, res: Response) {
    res.json(await service.documents());
  }

  async requests(_req: Request, res: Response) {
    res.json(await service.requests());
  }

  async createRequest(req: Request, res: Response) {
    if (!req.user?.id) {
      throw new HttpError(401, 'Usuario autenticado requerido.');
    }
    res.status(201).json(await service.createRequest({ subject: req.body.subject, area: req.body.area, requesterId: req.user.id }));
  }

  async notifications(req: Request, res: Response) {
    if (!req.user?.id) {
      throw new HttpError(401, 'Usuario autenticado requerido.');
    }
    res.json(await service.notifications(req.user.id));
  }
}
