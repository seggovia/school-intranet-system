import { Router } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { AuthController } from './auth.controller.js';
import { loginSchema, refreshSchema } from './auth.validators.js';

const controller = new AuthController();
export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), asyncHandler(controller.login.bind(controller)));
authRoutes.post('/refresh', validateBody(refreshSchema), asyncHandler(controller.refresh.bind(controller)));
authRoutes.post('/logout', validateBody(refreshSchema), asyncHandler(controller.logout.bind(controller)));
