import { z } from 'zod';

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
