import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { AnnouncementController } from './announcement.controller.js';
import { announcementIdParamSchema, createAnnouncementSchema } from './announcement.validators.js';

const controller = new AnnouncementController();
export const announcementRoutes = Router();

announcementRoutes.use(authenticate);
announcementRoutes.get('/', asyncHandler(controller.list.bind(controller)));
announcementRoutes.post('/', authorizeRoles('admin', 'director', 'teacher', 'inspector'), authorizePermissions('communications:manage'), validateBody(createAnnouncementSchema), asyncHandler(controller.create.bind(controller)));
announcementRoutes.post('/:id/read', validateParams(announcementIdParamSchema), asyncHandler(controller.markRead.bind(controller)));
