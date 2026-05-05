import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateQuery } from '../../shared/validate.js';
import { auditQuerySchema } from './audit.validators.js';
import { AuditService, type AuditQueryInput } from './audit.service.js';

const service = new AuditService();

export const auditRoutes = Router();

auditRoutes.use(authenticate);
auditRoutes.get('/audit', authorizeRoles('admin', 'director'), validateQuery(auditQuerySchema), asyncHandler(async (req, res) => {
  res.json(await service.list(req.query as unknown as AuditQueryInput));
}));
