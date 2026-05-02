import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { MeController } from './me.controller.js';
import { userPreferencesSchema } from './me.validators.js';

const controller = new MeController();
export const meRoutes = Router();

meRoutes.use(authenticate);
meRoutes.get('/dashboard', asyncHandler(controller.dashboard.bind(controller)));
meRoutes.get('/subjects', asyncHandler(controller.subjects.bind(controller)));
meRoutes.get('/schedule', asyncHandler(controller.schedule.bind(controller)));
meRoutes.get('/grades', asyncHandler(controller.grades.bind(controller)));
meRoutes.get('/attendance', asyncHandler(controller.attendance.bind(controller)));
meRoutes.get('/profile', asyncHandler(controller.profile.bind(controller)));
meRoutes.patch('/preferences', validateBody(userPreferencesSchema), asyncHandler(controller.updatePreferences.bind(controller)));
