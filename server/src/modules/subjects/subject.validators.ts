import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(12).toUpperCase()
});

export const subjectIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const unitIdParamSchema = z.object({
  unitId: z.string().trim().min(1)
});

export const materialIdParamSchema = z.object({
  materialId: z.string().trim().min(1)
});

export const assignmentIdParamSchema = z.object({
  assignmentId: z.string().trim().min(1)
});

export const createUnitSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(3000),
  duration: z.string().trim().max(80).optional(),
  outcomes: z.array(z.string().trim().min(1).max(300)).optional(),
  bibliography: z.array(z.string().trim().min(1).max(300)).optional(),
  order: z.number().int().min(0).optional()
});

export const updateUnitSchema = createUnitSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});

export const createMaterialSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(['presentacion', 'guia', 'actividad', 'evaluacion', 'documento', 'link']),
  fileUrl: z.string().trim().url().optional()
});

export const uploadMaterialSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(['presentacion', 'guia', 'documento'])
});

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(3000),
  dueDate: z.string().trim().optional()
});

export const updateAssignmentSchema = createAssignmentSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['activo', 'cerrado'])
});

export const submitAssignmentSchema = z.object({
  fileUrl: z.string().trim().url().optional(),
  comment: z.string().trim().max(2000).optional(),
  studentId: z.string().trim().min(1).optional()
});

export const uploadAssignmentSubmissionSchema = z.object({
  comment: z.string().trim().max(2000).optional(),
  studentId: z.string().trim().min(1).optional()
});

export const deleteAssignmentSubmissionSchema = z.object({
  studentId: z.string().trim().min(1).optional()
});
