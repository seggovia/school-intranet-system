import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(1000),
  type: z.string().trim().min(2).max(40).default('system')
});
