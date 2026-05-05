import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { RequestController } from './request.controller.js';
import { addRequestCommentSchema, createRequestSchema, requestIdParamSchema, updateRequestStatusSchema } from './request.validators.js';

const controller = new RequestController();
export const requestRoutes = Router();

requestRoutes.use(authenticate);
requestRoutes.get('/', asyncHandler(controller.list.bind(controller)));
requestRoutes.post('/', authorizeRoles('admin', 'director', 'teacher', 'guardian', 'student', 'inspector'), validateBody(createRequestSchema), asyncHandler(controller.create.bind(controller)));
requestRoutes.get('/:id', validateParams(requestIdParamSchema), asyncHandler(controller.detail.bind(controller)));
requestRoutes.post('/:id/comments', validateParams(requestIdParamSchema), validateBody(addRequestCommentSchema), asyncHandler(controller.addComment.bind(controller)));
requestRoutes.patch('/:id/status', authorizeRoles('admin', 'director', 'inspector'), authorizePermissions('requests:manage'), validateParams(requestIdParamSchema), validateBody(updateRequestStatusSchema), asyncHandler(controller.updateStatus.bind(controller)));
