// Esquemas de Mi cuenta (feature 002, contracts/rest-api.md). Son estrictos: un campo que no
// declaran (p. ej. "role") se rechaza con 400 en lugar de ignorarse.
import { z } from 'zod';
import { nameSchema, passwordSchema } from './authValidators.js';

const currentPasswordSchema = z.string().min(1, 'La contraseña es obligatoria').max(200);

export const updateAccountSchema = z.object({ name: nameSchema }).strict();

export const changePasswordSchema = z
  .object({ current_password: currentPasswordSchema, new_password: passwordSchema })
  .strict();

export const deleteAccountSchema = z.object({ password: currentPasswordSchema }).strict();
