import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { SectionController } from './section.controller.js';
import { createSectionSchema, sectionIdParamSchema } from './section.validators.js';

const controller = new SectionController();
export const sectionRoutes = Router();

sectionRoutes.use(authenticate);
sectionRoutes.get('/', asyncHandler(controller.list.bind(controller)));
sectionRoutes.get('/:id/students', validateParams(sectionIdParamSchema), asyncHandler(controller.students.bind(controller)));
sectionRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('academics:manage'), validateBody(createSectionSchema), asyncHandler(controller.create.bind(controller)));
