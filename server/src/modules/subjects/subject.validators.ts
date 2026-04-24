import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(12).toUpperCase()
});

export const subjectIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
