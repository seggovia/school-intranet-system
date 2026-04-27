import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { AttendanceController } from './attendance.controller.js';
import { attendanceRecordsQuerySchema, bulkAttendanceSchema } from './attendance.validators.js';
import { HttpError } from '../../shared/http-error.js';

const controller = new AttendanceController();
export const attendanceRoutes = Router();

function validateQuery(schema: typeof attendanceRecordsQuerySchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(new HttpError(400, 'Parametros invalidos.', parsed.error.flatten()));
    req.query = parsed.data as unknown as typeof req.query;
    return next();
  };
}

attendanceRoutes.use(authenticate);
attendanceRoutes.get('/context', authorizeRoles('admin', 'director', 'teacher', 'inspector'), asyncHandler(controller.context.bind(controller)));
attendanceRoutes.get('/records', authorizeRoles('admin', 'director', 'teacher', 'inspector'), validateQuery(attendanceRecordsQuerySchema), asyncHandler(controller.records.bind(controller)));
attendanceRoutes.post('/bulk', authorizeRoles('admin', 'director', 'teacher', 'inspector'), authorizePermissions('attendance:manage'), validateBody(bulkAttendanceSchema), asyncHandler(controller.bulk.bind(controller)));
attendanceRoutes.get('/me', authorizeRoles('student'), asyncHandler(controller.me.bind(controller)));
attendanceRoutes.get('/guardian', authorizeRoles('guardian'), asyncHandler(controller.guardian.bind(controller)));
attendanceRoutes.get('/summary', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.summary.bind(controller)));
