import { z } from 'zod';

const optionalString = z.preprocess((value) => value === '' ? undefined : value, z.string().trim().optional());

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  userId: optionalString,
  action: optionalString,
  entity: optionalString,
  search: optionalString,
  from: optionalString,
  to: optionalString
});
