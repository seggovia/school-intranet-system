import { z } from 'zod';

export const createRequestSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  area: z.string().trim().min(2).max(80)
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(['nuevo', 'en_revision', 'en_proceso', 'resuelto', 'rechazado'])
});

export const requestIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
