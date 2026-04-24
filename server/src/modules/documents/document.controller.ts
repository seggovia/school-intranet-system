import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { DocumentService } from './document.service.js';

const service = new DocumentService();

export class DocumentController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.create({ ...req.body, ownerId: req.user.id }));
  }

  async categories(_req: Request, res: Response) {
    res.json(await service.listCategories());
  }

  async createCategory(req: Request, res: Response) {
    res.status(201).json(await service.createCategory(req.body));
  }

  async createSubjectMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createSubjectMaterial(req.user, req.body));
  }
}
