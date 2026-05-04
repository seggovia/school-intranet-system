import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { NotificationController } from './notification.controller.js';
import { createNotificationSchema } from './notification.validators.js';

const controller = new NotificationController();
export const notificationRoutes = Router();

notificationRoutes.use(authenticate);
notificationRoutes.get('/', asyncHandler(controller.list.bind(controller)));
notificationRoutes.patch('/:id/read', asyncHandler(controller.markRead.bind(controller)));
notificationRoutes.patch('/read-all', asyncHandler(controller.markAllRead.bind(controller)));
notificationRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('communications:manage'), validateBody(createNotificationSchema), asyncHandler(controller.create.bind(controller)));
