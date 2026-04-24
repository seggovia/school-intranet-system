import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { SubjectController } from './subject.controller.js';
import { createSubjectSchema, subjectIdParamSchema } from './subject.validators.js';

const controller = new SubjectController();
export const subjectRoutes = Router();

subjectRoutes.use(authenticate);
subjectRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
subjectRoutes.get('/:id/detail', validateParams(subjectIdParamSchema), asyncHandler(controller.detail.bind(controller)));
subjectRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('academics:manage'), validateBody(createSubjectSchema), asyncHandler(controller.create.bind(controller)));
