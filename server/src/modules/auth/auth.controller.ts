import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

const service = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    const session = await service.login(req.body.email, req.body.password);
    res.json(session);
  }

  async refresh(req: Request, res: Response) {
    const session = await service.refresh(req.body.refreshToken);
    res.json(session);
  }

  async logout(req: Request, res: Response) {
    const result = await service.logout(req.body.refreshToken);
    res.json(result);
  }
}
