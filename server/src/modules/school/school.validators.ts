import { z } from 'zod';

export const createRequestSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  area: z.string().trim().min(2).max(80)
});
