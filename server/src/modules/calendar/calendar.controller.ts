import type { Request, Response } from 'express';
import { CalendarService } from './calendar.service.js';

const service = new CalendarService();

export class CalendarController {
  async events(_req: Request, res: Response) {
    res.json(await service.listEvents());
  }

  async createEvent(req: Request, res: Response) {
    res.status(201).json(await service.createEvent(req.body));
  }

  async schedules(_req: Request, res: Response) {
    res.json(await service.listSchedules());
  }
}
