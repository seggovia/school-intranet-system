import type { Request, Response } from 'express';
import { SubjectService } from './subject.service.js';
import { HttpError } from '../../shared/http-error.js';

const service = new SubjectService();

export class SubjectController {
  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async detail(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.detail(req.user, String(req.params.id)));
  }

  async createUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createUnit(req.user, String(req.params.id), req.body));
  }

  async updateUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updateUnit(req.user, String(req.params.unitId), req.body));
  }

  async deleteUnit(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteUnit(req.user, String(req.params.unitId)));
  }

  async createMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createMaterial(req.user, String(req.params.unitId), req.body));
  }

  async deleteMaterial(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.deleteMaterial(req.user, String(req.params.materialId)));
  }

  async createAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.createAssignment(req.user, String(req.params.unitId), req.body));
  }

  async submitAssignment(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.status(201).json(await service.submitAssignment(req.user, String(req.params.assignmentId), req.body));
  }
}
