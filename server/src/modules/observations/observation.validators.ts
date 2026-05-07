import { z } from 'zod';

export const observationTypeSchema = z.enum(['positiva', 'negativa', 'neutral']);

export const listObservationsQuerySchema = z.object({
  studentId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional()
});

export const createObservationSchema = z.object({
  studentId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional(),
  body: z.string().trim().min(5).max(500),
  type: observationTypeSchema.default('neutral'),
  date: z.coerce.date().default(() => new Date()),
  isVisible: z.boolean().default(true)
}).superRefine((input, ctx) => {
  if (input.date.getTime() > Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'La fecha no puede ser futura.' });
  }
});

export const observationIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
