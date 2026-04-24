import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { SubjectController } from './subject.controller.js';
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  createMaterialSchema,
  createSubjectSchema,
  createUnitSchema,
  materialIdParamSchema,
  subjectIdParamSchema,
  submitAssignmentSchema,
  unitIdParamSchema,
  updateUnitSchema
} from './subject.validators.js';

const controller = new SubjectController();
export const subjectRoutes = Router();

subjectRoutes.use(authenticate);
subjectRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
subjectRoutes.get('/:id/detail', validateParams(subjectIdParamSchema), asyncHandler(controller.detail.bind(controller)));
subjectRoutes.post('/:id/units', authorizeRoles('admin', 'director', 'teacher'), validateParams(subjectIdParamSchema), validateBody(createUnitSchema), asyncHandler(controller.createUnit.bind(controller)));
subjectRoutes.patch('/units/:unitId', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(updateUnitSchema), asyncHandler(controller.updateUnit.bind(controller)));
subjectRoutes.delete('/units/:unitId', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), asyncHandler(controller.deleteUnit.bind(controller)));
subjectRoutes.post('/units/:unitId/materials', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(createMaterialSchema), asyncHandler(controller.createMaterial.bind(controller)));
subjectRoutes.delete('/materials/:materialId', authorizeRoles('admin', 'director', 'teacher'), validateParams(materialIdParamSchema), asyncHandler(controller.deleteMaterial.bind(controller)));
subjectRoutes.post('/units/:unitId/assignments', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(createAssignmentSchema), asyncHandler(controller.createAssignment.bind(controller)));
subjectRoutes.post('/assignments/:assignmentId/submissions', authorizeRoles('student', 'guardian'), validateParams(assignmentIdParamSchema), validateBody(submitAssignmentSchema), asyncHandler(controller.submitAssignment.bind(controller)));
subjectRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('academics:manage'), validateBody(createSubjectSchema), asyncHandler(controller.create.bind(controller)));
