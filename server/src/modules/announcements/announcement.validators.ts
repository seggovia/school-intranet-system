import { z } from 'zod';

export const announcementIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(4).max(140),
  audience: z.string().trim().min(2).max(80),
  priority: z.enum(['normal', 'alta', 'critica']).default('normal'),
  body: z.string().trim().min(10).max(4000)
});
