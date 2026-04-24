import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  levelName: z.string().trim().min(2).max(80),
  levelOrder: z.coerce.number().int().min(1).default(1)
});
