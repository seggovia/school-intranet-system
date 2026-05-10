import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateQuery } from '../../shared/validate.js';
import { AuditController } from './audit.controller.js';
import { auditQuerySchema } from './audit.validators.js';

const controller = new AuditController();

export const auditRoutes = Router();

auditRoutes.use(authenticate);
auditRoutes.get('/audit', authorizeRoles('admin', 'director'), validateQuery(auditQuerySchema), asyncHandler(controller.list.bind(controller)));
