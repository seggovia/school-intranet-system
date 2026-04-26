import { Router } from 'express';
import { authenticate, authorizePermissions, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { SubjectController } from './subject.controller.js';
import { handleMaterialUpload } from './material-upload.middleware.js';
import { handleSubmissionUpload } from './submission-upload.middleware.js';
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  createSubmissionCommentSchema,
  createMaterialSchema,
  createSubjectSchema,
  createUnitSchema,
  deleteSubmissionFilesSchema,
  deleteAssignmentSubmissionSchema,
  materialIdParamSchema,
  subjectIdParamSchema,
  submitAssignmentSchema,
  reviewSubmissionSchema,
  replySubmissionSchema,
  submissionFileIdParamSchema,
  submissionCommentIdParamSchema,
  submissionIdParamSchema,
  unitIdParamSchema,
  uploadAssignmentSubmissionSchema,
  uploadMaterialSchema,
  updateAssignmentSchema,
  updateAssignmentStatusSchema,
  updateUnitSchema
} from './subject.validators.js';

const controller = new SubjectController();
export const subjectRoutes = Router();
export const assignmentReviewRoutes = Router();

subjectRoutes.use(authenticate);
subjectRoutes.get('/', authorizeRoles('admin', 'director', 'inspector'), asyncHandler(controller.list.bind(controller)));
subjectRoutes.get('/:id/detail', validateParams(subjectIdParamSchema), asyncHandler(controller.detail.bind(controller)));
subjectRoutes.post('/:id/units', authorizeRoles('admin', 'director', 'teacher'), validateParams(subjectIdParamSchema), validateBody(createUnitSchema), asyncHandler(controller.createUnit.bind(controller)));
subjectRoutes.patch('/units/:unitId', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(updateUnitSchema), asyncHandler(controller.updateUnit.bind(controller)));
subjectRoutes.delete('/units/:unitId', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), asyncHandler(controller.deleteUnit.bind(controller)));
subjectRoutes.post('/units/:unitId/materials', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(createMaterialSchema), asyncHandler(controller.createMaterial.bind(controller)));
subjectRoutes.post('/units/:unitId/materials/upload', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), handleMaterialUpload, validateBody(uploadMaterialSchema), asyncHandler(controller.uploadMaterial.bind(controller)));
subjectRoutes.delete('/materials/:materialId', authorizeRoles('admin', 'director', 'teacher'), validateParams(materialIdParamSchema), asyncHandler(controller.deleteMaterial.bind(controller)));
subjectRoutes.post('/units/:unitId/assignments', authorizeRoles('admin', 'director', 'teacher'), validateParams(unitIdParamSchema), validateBody(createAssignmentSchema), asyncHandler(controller.createAssignment.bind(controller)));
subjectRoutes.patch('/assignments/:assignmentId', authorizeRoles('admin', 'director', 'teacher'), validateParams(assignmentIdParamSchema), validateBody(updateAssignmentSchema), asyncHandler(controller.updateAssignment.bind(controller)));
subjectRoutes.patch('/assignments/:assignmentId/status', authorizeRoles('admin', 'director', 'teacher'), validateParams(assignmentIdParamSchema), validateBody(updateAssignmentStatusSchema), asyncHandler(controller.updateAssignmentStatus.bind(controller)));
subjectRoutes.delete('/assignments/:assignmentId', authorizeRoles('admin', 'director', 'teacher'), validateParams(assignmentIdParamSchema), asyncHandler(controller.deleteAssignment.bind(controller)));
subjectRoutes.post('/assignments/:assignmentId/submissions/upload', authorizeRoles('student', 'guardian'), validateParams(assignmentIdParamSchema), handleSubmissionUpload, validateBody(uploadAssignmentSubmissionSchema), asyncHandler(controller.uploadAssignment.bind(controller)));
subjectRoutes.post('/assignments/:assignmentId/submissions', authorizeRoles('student', 'guardian'), validateParams(assignmentIdParamSchema), validateBody(submitAssignmentSchema), asyncHandler(controller.submitAssignment.bind(controller)));
subjectRoutes.delete('/assignments/:assignmentId/submissions', authorizeRoles('student', 'guardian'), validateParams(assignmentIdParamSchema), validateBody(deleteAssignmentSubmissionSchema), asyncHandler(controller.deleteSubmission.bind(controller)));
subjectRoutes.post('/', authorizeRoles('admin', 'director'), authorizePermissions('academics:manage'), validateBody(createSubjectSchema), asyncHandler(controller.create.bind(controller)));

assignmentReviewRoutes.use(authenticate);
assignmentReviewRoutes.get('/assignments/:assignmentId/submissions', validateParams(assignmentIdParamSchema), asyncHandler(controller.listAssignmentSubmissions.bind(controller)));
assignmentReviewRoutes.patch('/submissions/:submissionId/review', authorizeRoles('admin', 'director', 'teacher'), validateParams(submissionIdParamSchema), validateBody(reviewSubmissionSchema), asyncHandler(controller.reviewSubmission.bind(controller)));
assignmentReviewRoutes.patch('/submissions/:submissionId/reply', authorizeRoles('student', 'guardian'), validateParams(submissionIdParamSchema), validateBody(replySubmissionSchema), asyncHandler(controller.replyToSubmission.bind(controller)));
assignmentReviewRoutes.post('/submissions/:submissionId/comments', validateParams(submissionIdParamSchema), validateBody(createSubmissionCommentSchema), asyncHandler(controller.addSubmissionComment.bind(controller)));
assignmentReviewRoutes.delete('/submission-comments/:commentId', validateParams(submissionCommentIdParamSchema), asyncHandler(controller.deleteSubmissionComment.bind(controller)));
assignmentReviewRoutes.delete('/submissions/:submissionId/files', authorizeRoles('student', 'guardian'), validateParams(submissionIdParamSchema), validateBody(deleteSubmissionFilesSchema), asyncHandler(controller.deleteSubmissionFiles.bind(controller)));
assignmentReviewRoutes.get('/submissions/:submissionId/download', validateParams(submissionIdParamSchema), asyncHandler(controller.downloadSubmission.bind(controller)));
assignmentReviewRoutes.get('/submission-files/:fileId/download', validateParams(submissionFileIdParamSchema), asyncHandler(controller.downloadSubmissionFile.bind(controller)));
