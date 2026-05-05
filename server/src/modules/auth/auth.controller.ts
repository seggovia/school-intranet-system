import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuditContext } from '../audit/audit.service.js';

const service = new AuthService();

function auditContext(req: Request): AuditContext {
  const userAgent = req.headers['user-agent'];
  return {
    ipAddress: req.ip,
    userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent
  };
}

export class AuthController {
  async login(req: Request, res: Response) {
    const session = await service.login(req.body.email, req.body.password, auditContext(req));
    res.json(session);
  }

  async refresh(req: Request, res: Response) {
    const session = await service.refresh(req.body.refreshToken);
    res.json(session);
  }

  async logout(req: Request, res: Response) {
    const result = await service.logout(req.body.refreshToken, auditContext(req));
    res.json(result);
  }

  async forgotPassword(req: Request, res: Response) {
    const result = await service.forgotPassword(req.body.email);
    res.json(result);
  }

  async resetPassword(req: Request, res: Response) {
    const result = await service.resetPassword(req.body);
    res.json(result);
  }
}
