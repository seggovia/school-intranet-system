import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { NotificationController } from './notification.controller.js';
import { createNotificationSchema } from './notification.validators.js';

const controller = new NotificationController();
export const notificationRoutes = Router();

function injectStreamToken(req: Request, _res: Response, next: NextFunction) {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  if (!req.headers.authorization && token) {
    req.headers.authorization = `Bearer ${token}`;
  }
  next();
}

notificationRoutes.get('/stream', injectStreamToken, authenticate, asyncHandler(controller.stream.bind(controller)));
notificationRoutes.use(authenticate);
notificationRoutes.get('/', asyncHandler(controller.list.bind(controller)));
notificationRoutes.patch('/:id/read', asyncHandler(controller.markRead.bind(controller)));
notificationRoutes.patch('/read-all', asyncHandler(controller.markAllRead.bind(controller)));
notificationRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('communications:manage'), validateBody(createNotificationSchema), asyncHandler(controller.create.bind(controller)));
