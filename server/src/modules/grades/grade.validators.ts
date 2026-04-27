import { z } from 'zod';

export const gradeStatusSchema = z.enum(['con_nota', 'pendiente', 'ausente', 'eximido']);
export const evaluationTypeSchema = z.enum(['prueba', 'trabajo', 'tarea', 'proyecto', 'participacion']);

export const createGradeSchema = z.object({
  assessmentId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  enrollmentId: z.string().trim().min(1),
  score: z.coerce.number().min(1).max(7)
});

export const updateGradeSchema = z.object({
  score: z.coerce.number().min(1).max(7)
});

export const gradeIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const gradebookContextQuerySchema = z.object({});

export const gradebookEvaluationsQuerySchema = z.object({
  sectionId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional()
});

export const createEvaluationSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  date: z.coerce.date(),
  weight: z.coerce.number().min(0.1).max(10).default(1),
  type: evaluationTypeSchema,
  description: z.string().trim().max(1000).optional().or(z.literal('').transform(() => undefined))
});

export const updateEvaluationSchema = createEvaluationSchema.partial();

export const evaluationIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const gradebookRecordsQuerySchema = z.object({
  evaluationId: z.string().trim().min(1)
});

export const bulkGradeRecordsSchema = z.object({
  evaluationId: z.string().trim().min(1),
  records: z.array(z.object({
    studentId: z.string().trim().min(1),
    status: gradeStatusSchema,
    score: z.coerce.number().min(1).max(7).nullable().optional(),
    comment: z.string().trim().max(500).nullable().optional().or(z.literal('').transform(() => undefined))
  })).min(1)
}).superRefine((input, ctx) => {
  input.records.forEach((record, index) => {
    if (record.status === 'con_nota' && (record.score === null || record.score === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['records', index, 'score'], message: 'La nota es requerida.' });
    }
    if (record.status !== 'con_nota' && record.score !== null && record.score !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['records', index, 'score'], message: 'La nota debe quedar vacia para este estado.' });
    }
  });
});
