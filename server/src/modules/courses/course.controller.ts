import type { Request, Response } from 'express';
import { CourseService } from './course.service.js';

const service = new CourseService();

export class CourseController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }
}
