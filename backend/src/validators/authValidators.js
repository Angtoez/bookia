import { z } from 'zod';
import './common.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('El correo no es válido').max(254));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, con letras y números';

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre admite como máximo 100 caracteres');

// Política de contraseñas (FR-002); la reutiliza el cambio de contraseña de la feature 002.
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_POLICY_MESSAGE)
  .max(200)
  .regex(/[A-Za-z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/[0-9]/, PASSWORD_POLICY_MESSAGE);

// FR-002. z.object descarta los campos que no declara, así que un "role" en el cuerpo se ignora.
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
