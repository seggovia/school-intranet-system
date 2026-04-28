import { Router } from 'express';
import { authenticate, authorizeRoles } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { validateBody, validateParams } from '../../shared/validate.js';
import { AdminController } from './admin.controller.js';
import {
  createAdminUserSchema,
  createClassroomSchema,
  createCourseSchema,
  createSectionSchema,
  createSubjectSchema,
  guardianStudentsSchema,
  guardianStudentDeleteSchema,
  idParamSchema,
  optionalResetPasswordSchema,
  sectionAssignSchema,
  statusSchema,
  subjectTeacherSchema,
  teacherAssignmentDeleteSchema,
  teacherAssignmentsSchema,
  updateAdminUserSchema,
  updateClassroomSchema,
  updateCourseSchema,
  updateSectionSchema,
  updateSubjectSchema
} from './admin.validators.js';

const controller = new AdminController();

export const adminRoutes = Router();

const managers = authorizeRoles('admin', 'director');
const academicReaders = authorizeRoles('admin', 'director', 'inspector');

adminRoutes.use(authenticate);

adminRoutes.get('/summary', managers, asyncHandler(controller.summary.bind(controller)));

adminRoutes.get('/users', managers, asyncHandler(controller.users.bind(controller)));
adminRoutes.post('/users', managers, validateBody(createAdminUserSchema), asyncHandler(controller.createUser.bind(controller)));
adminRoutes.patch('/users/:id', managers, validateParams(idParamSchema), validateBody(updateAdminUserSchema), asyncHandler(controller.updateUser.bind(controller)));
adminRoutes.patch('/users/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setUserStatus.bind(controller)));
adminRoutes.patch('/users/:id/reset-password', managers, validateParams(idParamSchema), validateBody(optionalResetPasswordSchema), asyncHandler(controller.resetUserPassword.bind(controller)));

adminRoutes.get('/students', academicReaders, asyncHandler(controller.students.bind(controller)));
adminRoutes.post('/students', managers, validateBody(createAdminUserSchema), asyncHandler(controller.createStudent.bind(controller)));
adminRoutes.patch('/students/:id', managers, validateParams(idParamSchema), validateBody(updateAdminUserSchema), asyncHandler(controller.updateStudent.bind(controller)));
adminRoutes.patch('/students/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setStudentStatus.bind(controller)));
adminRoutes.patch('/students/:id/section', managers, validateParams(idParamSchema), validateBody(sectionAssignSchema), asyncHandler(controller.assignStudentSection.bind(controller)));
adminRoutes.delete('/students/:id/section', managers, validateParams(idParamSchema), asyncHandler(controller.clearStudentSection.bind(controller)));

adminRoutes.get('/teachers', managers, asyncHandler(controller.teachers.bind(controller)));
adminRoutes.post('/teachers', managers, validateBody(createAdminUserSchema), asyncHandler(controller.createTeacher.bind(controller)));
adminRoutes.patch('/teachers/:id', managers, validateParams(idParamSchema), validateBody(updateAdminUserSchema), asyncHandler(controller.updateTeacher.bind(controller)));
adminRoutes.patch('/teachers/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setTeacherStatus.bind(controller)));
adminRoutes.post('/teachers/:id/assignments', managers, validateParams(idParamSchema), validateBody(teacherAssignmentsSchema), asyncHandler(controller.assignTeacher.bind(controller)));

adminRoutes.get('/guardians', managers, asyncHandler(controller.guardians.bind(controller)));
adminRoutes.post('/guardians', managers, validateBody(createAdminUserSchema), asyncHandler(controller.createGuardian.bind(controller)));
adminRoutes.patch('/guardians/:id', managers, validateParams(idParamSchema), validateBody(updateAdminUserSchema), asyncHandler(controller.updateGuardian.bind(controller)));
adminRoutes.patch('/guardians/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setGuardianStatus.bind(controller)));
adminRoutes.post('/guardians/:id/students', managers, validateParams(idParamSchema), validateBody(guardianStudentsSchema), asyncHandler(controller.linkGuardianStudents.bind(controller)));

adminRoutes.get('/courses', managers, asyncHandler(controller.courses.bind(controller)));
adminRoutes.post('/courses', managers, validateBody(createCourseSchema), asyncHandler(controller.createCourse.bind(controller)));
adminRoutes.patch('/courses/:id', managers, validateParams(idParamSchema), validateBody(updateCourseSchema), asyncHandler(controller.updateCourse.bind(controller)));
adminRoutes.patch('/courses/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setCourseStatus.bind(controller)));

adminRoutes.get('/sections', academicReaders, asyncHandler(controller.sections.bind(controller)));
adminRoutes.post('/sections', managers, validateBody(createSectionSchema), asyncHandler(controller.createSection.bind(controller)));
adminRoutes.patch('/sections/:id', managers, validateParams(idParamSchema), validateBody(updateSectionSchema), asyncHandler(controller.updateSection.bind(controller)));
adminRoutes.patch('/sections/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setSectionStatus.bind(controller)));
adminRoutes.delete('/sections/:id', managers, validateParams(idParamSchema), asyncHandler(controller.deleteSection.bind(controller)));

adminRoutes.get('/classrooms', managers, asyncHandler(controller.classrooms.bind(controller)));
adminRoutes.post('/classrooms', managers, validateBody(createClassroomSchema), asyncHandler(controller.createClassroom.bind(controller)));
adminRoutes.patch('/classrooms/:id', managers, validateParams(idParamSchema), validateBody(updateClassroomSchema), asyncHandler(controller.updateClassroom.bind(controller)));
adminRoutes.patch('/classrooms/:id/status', managers, validateParams(idParamSchema), validateBody(statusSchema), asyncHandler(controller.setClassroomStatus.bind(controller)));
adminRoutes.delete('/classrooms/:id', managers, validateParams(idParamSchema), asyncHandler(controller.deleteClassroom.bind(controller)));

adminRoutes.get('/subjects', managers, asyncHandler(controller.subjects.bind(controller)));
adminRoutes.post('/subjects', managers, validateBody(createSubjectSchema), asyncHandler(controller.createSubject.bind(controller)));
adminRoutes.patch('/subjects/:id', managers, validateParams(idParamSchema), validateBody(updateSubjectSchema), asyncHandler(controller.updateSubject.bind(controller)));
adminRoutes.post('/subjects/:id/assign-teacher', managers, validateParams(idParamSchema), validateBody(subjectTeacherSchema), asyncHandler(controller.assignSubjectTeacher.bind(controller)));

adminRoutes.get('/assignments', managers, asyncHandler(controller.assignments.bind(controller)));
adminRoutes.post('/assignments/teacher-subject-section', managers, validateBody(teacherAssignmentsSchema.extend({ teacherId: idParamSchema.shape.id })), asyncHandler(controller.assignTeacherRelation.bind(controller)));
adminRoutes.delete('/assignments/teacher-subject-section', managers, validateBody(teacherAssignmentDeleteSchema), asyncHandler(controller.removeTeacherRelation.bind(controller)));
adminRoutes.post('/assignments/student-section', managers, validateBody(sectionAssignSchema.extend({ studentId: idParamSchema.shape.id })), asyncHandler(controller.assignStudentRelation.bind(controller)));
adminRoutes.post('/assignments/guardian-students', managers, validateBody(guardianStudentsSchema.extend({ guardianId: idParamSchema.shape.id })), asyncHandler(controller.assignGuardianRelation.bind(controller)));
adminRoutes.delete('/assignments/guardian-students', managers, validateBody(guardianStudentDeleteSchema), asyncHandler(controller.unlinkGuardianRelation.bind(controller)));
