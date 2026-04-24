import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { DocumentController } from './document.controller.js';
import { createDocumentCategorySchema, createDocumentSchema, createSubjectMaterialSchema } from './document.validators.js';

const controller = new DocumentController();
export const documentRoutes = Router();

documentRoutes.use(authenticate);
documentRoutes.get('/', asyncHandler(controller.list.bind(controller)));
documentRoutes.post('/', authorizeRoles('admin', 'director', 'inspector'), authorizePermissions('documents:manage'), validateBody(createDocumentSchema), asyncHandler(controller.create.bind(controller)));
documentRoutes.post('/materials', authorizeRoles('admin', 'director', 'teacher'), validateBody(createSubjectMaterialSchema), asyncHandler(controller.createSubjectMaterial.bind(controller)));
documentRoutes.get('/categories', asyncHandler(controller.categories.bind(controller)));
documentRoutes.post('/categories', authorizeRoles('admin', 'director'), authorizePermissions('documents:manage'), validateBody(createDocumentCategorySchema), asyncHandler(controller.createCategory.bind(controller)));
