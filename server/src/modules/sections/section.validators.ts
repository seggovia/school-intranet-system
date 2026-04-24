import { z } from 'zod';

export const createSectionSchema = z.object({
  courseId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(20),
  teacherId: z.string().trim().min(1).optional(),
  classroomId: z.string().trim().min(1).optional()
});

export const sectionIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
