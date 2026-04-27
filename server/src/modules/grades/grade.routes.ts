import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { GradeController } from './grade.controller.js';
import {
  bulkGradeRecordsSchema,
  createEvaluationSchema,
  createGradeSchema,
  evaluationIdParamSchema,
  gradebookEvaluationsQuerySchema,
  gradebookRecordsQuerySchema,
  gradeIdParamSchema,
  updateEvaluationSchema,
  updateGradeSchema
} from './grade.validators.js';
import { validateQuery } from '../../shared/validate.js';

const controller = new GradeController();
export const gradeRoutes = Router();
export const gradebookRoutes = Router();

gradeRoutes.use(authenticate);
gradeRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
gradeRoutes.post('/', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateBody(createGradeSchema), asyncHandler(controller.create.bind(controller)));
gradeRoutes.patch('/:id', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateParams(gradeIdParamSchema), validateBody(updateGradeSchema), asyncHandler(controller.update.bind(controller)));

gradebookRoutes.use(authenticate);
gradebookRoutes.get('/context', authorizeRoles('admin', 'director', 'teacher', 'inspector'), asyncHandler(controller.context.bind(controller)));
gradebookRoutes.get('/evaluations', authorizeRoles('admin', 'director', 'teacher', 'inspector'), validateQuery(gradebookEvaluationsQuerySchema), asyncHandler(controller.evaluations.bind(controller)));
gradebookRoutes.post('/evaluations', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateBody(createEvaluationSchema), asyncHandler(controller.createEvaluation.bind(controller)));
gradebookRoutes.patch('/evaluations/:id', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateParams(evaluationIdParamSchema), validateBody(updateEvaluationSchema), asyncHandler(controller.updateEvaluation.bind(controller)));
gradebookRoutes.delete('/evaluations/:id', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateParams(evaluationIdParamSchema), asyncHandler(controller.deleteEvaluation.bind(controller)));
gradebookRoutes.get('/records', authorizeRoles('admin', 'director', 'teacher', 'inspector'), validateQuery(gradebookRecordsQuerySchema), asyncHandler(controller.records.bind(controller)));
gradebookRoutes.post('/records/bulk', authorizeRoles('admin', 'director', 'teacher'), authorizePermissions('grades:manage'), validateBody(bulkGradeRecordsSchema), asyncHandler(controller.bulk.bind(controller)));
gradebookRoutes.get('/me', authorizeRoles('student'), asyncHandler(controller.me.bind(controller)));
gradebookRoutes.get('/guardian', authorizeRoles('guardian'), asyncHandler(controller.guardian.bind(controller)));
gradebookRoutes.get('/summary', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.summary.bind(controller)));
