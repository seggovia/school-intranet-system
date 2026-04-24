import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { AssessmentController } from './assessment.controller.js';
import { createAssessmentSchema } from './assessment.validators.js';

const controller = new AssessmentController();
export const assessmentRoutes = Router();

assessmentRoutes.use(authenticate);
assessmentRoutes.get('/', authorizeRoles('admin', 'director'), asyncHandler(controller.list.bind(controller)));
assessmentRoutes.post('/', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('academics:manage'), validateBody(createAssessmentSchema), asyncHandler(controller.create.bind(controller)));
