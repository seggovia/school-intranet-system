import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { UserService } from './user.service.js';

const service = new UserService();

export class UserController {
  async me(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.me(req.user.id));
  }

  async list(_req: Request, res: Response) {
    res.json(await service.list());
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await service.create(req.body));
  }

  async update(req: Request, res: Response) {
    res.json(await service.update(String(req.params.id), req.body));
  }

  async updateRoles(req: Request, res: Response) {
    res.json(await service.updateRoles(String(req.params.id), req.body.roles));
  }

  async deactivate(req: Request, res: Response) {
    res.json(await service.deactivate(String(req.params.id)));
  }

  async reactivate(req: Request, res: Response) {
    res.json(await service.reactivate(String(req.params.id)));
  }
}
