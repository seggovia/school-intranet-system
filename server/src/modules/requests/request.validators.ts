import { z } from 'zod';

export const requestStatusSchema = z.enum(['nuevo', 'en_proceso', 'resuelto', 'cerrado', 'rechazado']);

export const createRequestSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  area: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['normal', 'alta', 'urgente']).default('normal')
});

export const updateRequestStatusSchema = z.object({
  status: requestStatusSchema
});

export const addRequestCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000)
});

export const requestIdParamSchema = z.object({
  id: z.string().trim().min(1)
});
