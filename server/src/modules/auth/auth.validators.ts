import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string({ required_error: 'Correo es obligatorio' }).trim().min(1, 'Correo es obligatorio').email('Formato de correo inválido').toLowerCase(),
  password: z.string({ required_error: 'Contraseña requerida' }).min(1, 'Contraseña requerida').min(6, 'La contraseña debe tener al menos 6 caracteres').max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Correo es obligatorio' }).trim().min(1, 'Correo es obligatorio').email('Formato de correo invalido').toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token requerido' }).trim().min(20, 'Token requerido'),
  password: z.string({ required_error: 'Contraseña requerida' }).min(6, 'La contraseña debe tener al menos 6 caracteres').max(128)
});
