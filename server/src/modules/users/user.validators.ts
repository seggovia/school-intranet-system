import { z } from 'zod';

export const roleKeySchema = z.enum(['admin', 'teacher', 'student', 'guardian', 'director', 'inspector']);

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  avatar: z.string().trim().min(1).max(8),
  department: z.string().trim().min(2).max(120),
  roles: z.array(roleKeySchema).min(1)
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(8).max(128).optional(),
  avatar: z.string().trim().min(1).max(8).optional(),
  department: z.string().trim().min(2).max(120).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.'
});

export const updateUserRolesSchema = z.object({
  roles: z.array(roleKeySchema).min(1)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
