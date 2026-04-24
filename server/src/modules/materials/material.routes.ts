import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateParams } from '../../shared/validate.js';
import { materialIdParamSchema } from '../subjects/subject.validators.js';
import { MaterialController } from './material.controller.js';

const controller = new MaterialController();
export const materialRoutes = Router();

materialRoutes.use(authenticate);
materialRoutes.get('/:materialId/download', validateParams(materialIdParamSchema), asyncHandler(controller.download.bind(controller)));
