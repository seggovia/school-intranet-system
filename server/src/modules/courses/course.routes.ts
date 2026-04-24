import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { CourseController } from './course.controller.js';
import { createCourseSchema } from './course.validators.js';

const controller = new CourseController();
export const courseRoutes = Router();

courseRoutes.use(authenticate);
courseRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
courseRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('academics:manage'), validateBody(createCourseSchema), asyncHandler(controller.create.bind(controller)));
