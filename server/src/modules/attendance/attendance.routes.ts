import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { AttendanceController } from './attendance.controller.js';
import { attendanceIdParamSchema, bulkAttendanceSchema, createAttendanceSchema, updateAttendanceSchema } from './attendance.validators.js';

const controller = new AttendanceController();
export const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);
attendanceRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
attendanceRoutes.post('/bulk', authorizeRoles('admin', 'director', 'teacher', 'inspector'), authorizePermissions('attendance:manage'), validateBody(bulkAttendanceSchema), asyncHandler(controller.bulkCreate.bind(controller)));
attendanceRoutes.post('/', authorizeRoles('admin', 'director', 'teacher', 'inspector'), authorizePermissions('attendance:manage'), validateBody(createAttendanceSchema), asyncHandler(controller.create.bind(controller)));
attendanceRoutes.patch('/:id', authorizeRoles('admin', 'director', 'teacher', 'inspector'), authorizePermissions('attendance:manage'), validateParams(attendanceIdParamSchema), validateBody(updateAttendanceSchema), asyncHandler(controller.update.bind(controller)));
