import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { SchoolController } from './school.controller.js';
import { createRequestSchema } from './school.validators.js';

const controller = new SchoolController();
export const schoolRoutes = Router();

schoolRoutes.use(authenticate);

schoolRoutes.get('/dashboard', asyncHandler(controller.dashboard.bind(controller)));
schoolRoutes.get('/courses', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.courses.bind(controller)));
schoolRoutes.get('/students', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.students.bind(controller)));
schoolRoutes.get('/subjects', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.subjects.bind(controller)));
schoolRoutes.get('/schedules', asyncHandler(controller.schedules.bind(controller)));
schoolRoutes.get('/attendance', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.attendance.bind(controller)));
schoolRoutes.get('/assessments', authorizeRoles('admin', 'director'), asyncHandler(controller.assessments.bind(controller)));
schoolRoutes.get('/announcements', asyncHandler(controller.announcements.bind(controller)));
schoolRoutes.get('/events', asyncHandler(controller.events.bind(controller)));
schoolRoutes.get('/documents', asyncHandler(controller.documents.bind(controller)));
schoolRoutes.get('/notifications', asyncHandler(controller.notifications.bind(controller)));
schoolRoutes.get('/requests', asyncHandler(controller.requests.bind(controller)));
schoolRoutes.post('/requests', authorizeRoles('admin', 'director', 'teacher', 'guardian', 'student', 'inspector'), validateBody(createRequestSchema), asyncHandler(controller.createRequest.bind(controller)));
