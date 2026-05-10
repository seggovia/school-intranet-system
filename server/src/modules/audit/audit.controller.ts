import type { Request, Response } from 'express';
import { AuditService, type AuditQueryInput } from './audit.service.js';

const service = new AuditService();

export class AuditController {
  async list(req: Request, res: Response) {
    res.json(await service.list(req.query as unknown as AuditQueryInput));
  }
}
