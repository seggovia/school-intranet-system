import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { NotificationController } from './notification.controller.js';
import { createNotificationSchema } from './notification.validators.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http-error.js';
import type { JwtUser } from '../auth/auth.types.js';

const controller = new NotificationController();
export const notificationRoutes = Router();

function authenticateStream(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const headerToken = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken ?? queryToken;
  if (!token) return next(new HttpError(401, 'Token de acceso requerido.'));
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUser;
    return next();
  } catch {
    return next(new HttpError(401, 'Token de acceso invalido o expirado.'));
  }
}

notificationRoutes.get('/stream', authenticateStream, asyncHandler(controller.stream.bind(controller)));
notificationRoutes.use(authenticate);
notificationRoutes.get('/', asyncHandler(controller.list.bind(controller)));
notificationRoutes.patch('/:id/read', asyncHandler(controller.markRead.bind(controller)));
notificationRoutes.patch('/read-all', asyncHandler(controller.markAllRead.bind(controller)));
notificationRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('communications:manage'), validateBody(createNotificationSchema), asyncHandler(controller.create.bind(controller)));
