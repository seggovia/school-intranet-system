import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { PeriodController } from './period.controller.js';
import { createPeriodSchema, periodIdParamSchema, updatePeriodSchema } from './period.validators.js';

const controller = new PeriodController();
export const periodRoutes = Router();

periodRoutes.use(authenticate);
periodRoutes.get('/', asyncHandler(controller.list.bind(controller)));
periodRoutes.post('/', authorizeRoles('admin'), validateBody(createPeriodSchema), asyncHandler(controller.create.bind(controller)));
periodRoutes.patch('/:id', authorizeRoles('admin'), validateParams(periodIdParamSchema), validateBody(updatePeriodSchema), asyncHandler(controller.update.bind(controller)));
periodRoutes.delete('/:id', authorizeRoles('admin'), validateParams(periodIdParamSchema), asyncHandler(controller.delete.bind(controller)));
