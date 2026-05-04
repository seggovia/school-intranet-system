import { z } from 'zod';

export const userPreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  language: z.enum(['es', 'en']),
  notifications: z.object({
    email: z.boolean(),
    academic: z.boolean(),
    tickets: z.boolean()
  })
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido.').max(80),
  lastName: z.string().trim().min(1, 'Apellido requerido.').max(80)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida.'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña.')
}).refine((input) => input.newPassword === input.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword']
});

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
