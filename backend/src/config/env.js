// Carga y valida las variables de entorno (principio II: secretos solo desde el entorno).
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// backend/.env, independientemente del directorio desde el que se lance el proceso.
const ENV_PATH = fileURLToPath(new URL('../../.env', import.meta.url));
dotenv.config({ path: ENV_PATH, quiet: true });

// Las variables vacías en .env cuentan como no definidas.
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());
const intWithDefault = (def, min) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(min).default(def));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string({ error: 'MONGODB_URI es obligatoria' })
    .regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI debe empezar por mongodb:// o mongodb+srv://'),
  MONGODB_DB_NAME: z.preprocess((v) => (v === '' ? undefined : v), z.string().default('bookia')),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET es obligatoria' })
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  BCRYPT_ROUNDS: intWithDefault(12, 10),
  PORT: intWithDefault(3000, 1),
  CORS_ORIGIN: optionalString,
  CURRENCY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default('EUR'),
  ),
  MAX_ACTIVE_RESERVATIONS: intWithDefault(5, 1),
  PENDING_TTL_DAYS: intWithDefault(7, 0),
  PICKUP_TTL_DAYS: intWithDefault(3, 0),
  EXPIRATION_INTERVAL_MS: intWithDefault(60000, 1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Configuración no válida en backend/.env:\n${lines.join('\n')}`);
  process.exit(1);
}

export const ENV = Object.freeze(parsed.data);
