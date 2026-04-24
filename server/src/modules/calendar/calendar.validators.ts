import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  date: z.coerce.date(),
  type: z.enum(['academico', 'convivencia', 'administrativo', 'familias']),
  location: z.string().trim().min(2).max(120)
});
