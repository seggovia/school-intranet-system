import { z } from 'zod';

export const periodIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

const periodSchema = z.object({
  name: z.string().trim().min(3).max(120),
  year: z.coerce.number().int().min(2000).max(2100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true)
});

export const createPeriodSchema = periodSchema.superRefine((input, ctx) => {
  if (input.endDate < input.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La fecha de termino debe ser posterior al inicio.' });
  }
});

export const updatePeriodSchema = periodSchema.partial().superRefine((input, ctx) => {
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La fecha de termino debe ser posterior al inicio.' });
  }
});
