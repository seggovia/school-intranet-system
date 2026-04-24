import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { CalendarController } from './calendar.controller.js';
import { createEventSchema } from './calendar.validators.js';

const controller = new CalendarController();
export const calendarRoutes = Router();

calendarRoutes.use(authenticate);
calendarRoutes.get('/events', asyncHandler(controller.events.bind(controller)));
calendarRoutes.post('/events', authorizeRoles('admin', 'director', 'inspector'), authorizePermissions('academics:manage'), validateBody(createEventSchema), asyncHandler(controller.createEvent.bind(controller)));
calendarRoutes.get('/schedules', asyncHandler(controller.schedules.bind(controller)));
