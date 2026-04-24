import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { GradeController } from './grade.controller.js';
import { createGradeSchema, gradeIdParamSchema, updateGradeSchema } from './grade.validators.js';

const controller = new GradeController();
export const gradeRoutes = Router();

gradeRoutes.use(authenticate);
gradeRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
gradeRoutes.post('/', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateBody(createGradeSchema), asyncHandler(controller.create.bind(controller)));
gradeRoutes.patch('/:id', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateParams(gradeIdParamSchema), validateBody(updateGradeSchema), asyncHandler(controller.update.bind(controller)));
