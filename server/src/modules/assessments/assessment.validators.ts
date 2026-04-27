import { z } from 'zod';

export const createAssessmentSchema = z.object({
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(3).max(140),
  date: z.coerce.date(),
  weight: z.coerce.number().positive().default(1)
});
