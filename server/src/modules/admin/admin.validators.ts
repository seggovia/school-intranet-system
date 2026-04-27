import { z } from 'zod';

const roleSchema = z.enum(['admin', 'director', 'teacher', 'student', 'guardian', 'inspector']);
const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));
const optionalId = z.string().trim().min(1).optional().or(z.literal('').transform(() => undefined));
const optionalRut = z.string().trim().min(5, 'RUT/identificador demasiado corto').max(30).optional().or(z.literal('').transform(() => undefined));
const optionalPhone = z.string().trim().regex(/^[+\d\s()-]{7,30}$/, 'Telefono invalido').optional().or(z.literal('').transform(() => undefined));

export const idParamSchema = z.object({ id: z.string().trim().min(1) });

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  lastName: optionalTrimmed(120),
  email: z.string().trim().min(1, 'Correo requerido').email('Correo válido requerido').toLowerCase(),
  role: roleSchema,
  department: optionalTrimmed(120),
  password: z.string().trim().min(6).max(80).optional().or(z.literal('').transform(() => undefined)),
  rut: optionalRut,
  phone: optionalPhone,
  birthDate: optionalTrimmed(30),
  sectionId: optionalId,
  relationship: optionalTrimmed(80),
  studentIds: z.array(z.string().trim().min(1)).optional()
});

export const updateAdminUserSchema = createAdminUserSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo.'
});

export const statusSchema = z.object({ isActive: z.boolean() });

export const optionalResetPasswordSchema = z.object({
  password: z.string().trim().min(6).max(80).optional()
}).optional().default({});

export const sectionAssignSchema = z.object({ sectionId: z.string().trim().min(1) });

export const teacherAssignmentDeleteSchema = z.object({
  teacherId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional()
});

export const guardianStudentDeleteSchema = z.object({
  guardianId: z.string().trim().min(1),
  studentId: z.string().trim().min(1)
});

export const teacherAssignmentsSchema = z.object({
  subjectIds: z.array(z.string().trim().min(1)).optional(),
  sectionIds: z.array(z.string().trim().min(1)).optional()
});

export const guardianStudentsSchema = z.object({
  studentIds: z.array(z.string().trim().min(1)).min(1),
  relationship: z.string().trim().max(80).optional()
});

export const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  levelId: z.string().trim().min(1).optional()
});

export const updateCourseSchema = createCourseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo.'
});

export const createSectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  courseId: z.string().trim().min(1),
  teacherId: z.string().trim().min(1).optional(),
  classroomId: z.string().trim().min(1).optional()
});

export const updateSectionSchema = createSectionSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo.'
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(12).toUpperCase(),
  courseIds: z.array(z.string().trim().min(1)).optional(),
  sectionIds: z.array(z.string().trim().min(1)).optional(),
  teacherIds: z.array(z.string().trim().min(1)).optional()
});

export const updateSubjectSchema = createSubjectSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo.'
});

export const subjectTeacherSchema = z.object({
  teacherId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional()
});
