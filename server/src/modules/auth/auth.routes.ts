import { Router } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody } from '../../shared/validate.js';
import { AuthController } from './auth.controller.js';
import { forgotPasswordSchema, loginSchema, refreshSchema, resetPasswordSchema } from './auth.validators.js';

const controller = new AuthController();
export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), asyncHandler(controller.login.bind(controller)));
authRoutes.post('/refresh', validateBody(refreshSchema), asyncHandler(controller.refresh.bind(controller)));
authRoutes.post('/logout', validateBody(refreshSchema), asyncHandler(controller.logout.bind(controller)));
authRoutes.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(controller.forgotPassword.bind(controller)));
authRoutes.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword.bind(controller)));
