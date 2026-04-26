import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { MaterialService } from './material.service.js';

const service = new MaterialService();

export class MaterialController {
  async download(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    const file = await service.download(req.user, String(req.params.materialId));
    res.download(file.absolutePath, file.downloadName);
  }
}
