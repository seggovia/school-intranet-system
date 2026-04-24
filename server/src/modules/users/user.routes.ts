import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { UserController } from './user.controller.js';
import { createUserSchema, updateUserRolesSchema, updateUserSchema, userIdParamSchema } from './user.validators.js';

const controller = new UserController();
export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/me', asyncHandler(controller.me.bind(controller)));
userRoutes.get('/', authorizeRoles('admin', 'director'), authorizePermissions('users:manage'), asyncHandler(controller.list.bind(controller)));
userRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('users:manage'), validateBody(createUserSchema), asyncHandler(controller.create.bind(controller)));
userRoutes.patch('/:id', authorizeRoles('admin', 'director'), authorizePermissions('users:manage'), validateParams(userIdParamSchema), validateBody(updateUserSchema), asyncHandler(controller.update.bind(controller)));
userRoutes.patch('/:id/roles', authorizeRoles('admin'), authorizePermissions('roles:manage'), validateParams(userIdParamSchema), validateBody(updateUserRolesSchema), asyncHandler(controller.updateRoles.bind(controller)));
userRoutes.patch('/:id/deactivate', authorizeRoles('admin', 'director'), authorizePermissions('users:manage'), validateParams(userIdParamSchema), asyncHandler(controller.deactivate.bind(controller)));
userRoutes.patch('/:id/reactivate', authorizeRoles('admin', 'director'), authorizePermissions('users:manage'), validateParams(userIdParamSchema), asyncHandler(controller.reactivate.bind(controller)));
