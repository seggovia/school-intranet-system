import type { Request, Response } from 'express';
import { HttpError } from '../../shared/http-error.js';
import { MeService } from './me.service.js';
import { NotificationService } from '../notifications/notification.service.js';

const service = new MeService();
const notifications = new NotificationService();

export class MeController {
  async dashboard(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.dashboard(req.user));
  }

  async subjects(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.subjects(req.user));
  }

  async schedule(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.schedule(req.user));
  }

  async grades(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.grades(req.user));
  }

  async attendance(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.attendance(req.user));
  }

  async profile(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.profile(req.user));
  }

  async updatePreferences(req: Request, res: Response) {
    if (!req.user) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await service.updatePreferences(req.user, req.body));
  }

  async notifications(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await notifications.listForUser(req.user.id));
  }

  async markNotificationRead(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await notifications.markRead(req.user.id, String(req.params.id)));
  }

  async markAllNotificationsRead(req: Request, res: Response) {
    if (!req.user?.id) throw new HttpError(401, 'Usuario autenticado requerido.');
    res.json(await notifications.markAllRead(req.user.id));
  }
}
