import { z } from 'zod';

const roleSchema = z.enum(['admin', 'director', 'teacher', 'student', 'guardian', 'inspector']);
const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));
const optionalId = z.string().trim().min(1).optional().or(z.literal('').transform(() => undefined));
const optionalRut = z.string().trim().min(5, 'RUT/identificador demasiado corto').max(30).optional().or(z.literal('').transform(() => undefined));
const optionalPhone = z.string().trim().regex(/^[+\d\s()-]{7,30}$/, 'Telefono invalido').optional().or(z.literal('').transform(() => undefined));

export const idParamSchema = z.object({ id: z.string().trim().min(1) });

const chileanRutPattern = /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/;

const adminUserBaseSchema = z.object({
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

export const createAdminUserSchema = adminUserBaseSchema.superRefine((value, ctx) => {
  if (value.role === 'guardian' && value.rut && !chileanRutPattern.test(value.rut)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rut'], message: 'RUT/identificador invalido.' });
  }
});

export const updateAdminUserSchema = adminUserBaseSchema.partial().superRefine((value, ctx) => {
  if (value.role === 'guardian' && value.rut && !chileanRutPattern.test(value.rut)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rut'], message: 'RUT/identificador invalido.' });
  }
}).refine((value) => Object.keys(value).length > 0, {
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

const courseInitialSectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  teacherId: optionalId,
  classroomId: optionalId
});

export const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  levelId: z.string().trim().min(1),
  sections: z.array(courseInitialSectionSchema).optional().default([])
}).superRefine((value, ctx) => {
  const names = new Set<string>();
  value.sections.forEach((section, index) => {
    const key = section.name.trim().toLowerCase();
    if (names.has(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index, 'name'], message: 'La seccion no puede repetirse dentro del curso.' });
    }
    names.add(key);
  });
});

export const updateCourseSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  levelId: optionalId
}).refine((value) => Object.keys(value).length > 0, {
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

export const createClassroomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  capacity: z.coerce.number().int().positive(),
  type: z.enum(['aula', 'laboratorio', 'biblioteca', 'gimnasio', 'otro']).optional().default('aula')
});

export const updateClassroomSchema = createClassroomSchema.partial().refine((value) => Object.keys(value).length > 0, {
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
