import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams, validateQuery } from '../../shared/validate.js';
import { ObservationController } from './observation.controller.js';
import { createObservationSchema, listObservationsQuerySchema, observationIdParamSchema } from './observation.validators.js';

const controller = new ObservationController();
export const observationRoutes = Router();

observationRoutes.use(authenticate);
observationRoutes.get('/', authorizeRoles('teacher', 'admin', 'inspector'), validateQuery(listObservationsQuerySchema), asyncHandler(controller.list.bind(controller)));
observationRoutes.post('/', authorizeRoles('teacher', 'inspector', 'admin'), validateBody(createObservationSchema), asyncHandler(controller.create.bind(controller)));
observationRoutes.delete('/:id', authorizeRoles('teacher', 'inspector', 'admin'), validateParams(observationIdParamSchema), asyncHandler(controller.delete.bind(controller)));
