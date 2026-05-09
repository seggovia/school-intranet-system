import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { ReportsController } from './reports.controller.js';

const controller = new ReportsController();
export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.get('/student/:studentId/report-card', asyncHandler(controller.studentReportCard.bind(controller)));
