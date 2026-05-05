import type { Request, Response } from 'express';
import { PeriodService } from './period.service.js';

const service = new PeriodService();

export class PeriodController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async update(req: Request, res: Response) {
    res.json(await service.update(String(req.params.id), req.body));
  }

  async delete(req: Request, res: Response) {
    res.json(await service.delete(String(req.params.id)));
  }
}
