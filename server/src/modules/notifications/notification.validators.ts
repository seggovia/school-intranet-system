import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(500)
});
