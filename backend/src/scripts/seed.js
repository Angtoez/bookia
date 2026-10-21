// Seed de instalación (research R12): índices, géneros y administrador inicial.
// Es idempotente: ejecutarlo varias veces no duplica registros.
import bcrypt from 'bcrypt';
import { ENV } from '../config/env.js';
import { connectDb, describeConnection, disconnectDb } from '../config/db.js';
import { User, syncAllIndexes } from '../models/index.js';
import { GENRE_NAMES, seedGenres } from './genres.js';

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

async function seedAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password) {
    console.warn('ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD vacíos: no se crea el administrador.');
    return;
  }
  if (!PASSWORD_POLICY.test(password)) {
    console.warn('ADMIN_PASSWORD debe tener al menos 8 caracteres, con letras y números.');
    return;
  }
  if (await User.exists({ email })) {
    console.info(`El administrador ${email} ya existe: no se modifica.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, ENV.BCRYPT_ROUNDS);
  await User.create({ name, email, password_hash: passwordHash, role: 'admin' });
  console.info(`Administrador ${email} creado.`);
}

async function main() {
  await connectDb();
  console.info(`Conectado a ${describeConnection()}`);
  await syncAllIndexes();
  console.info('Colecciones e índices sincronizados.');
  const inserted = await seedGenres();
  console.info(`Géneros: ${inserted} nuevos, ${GENRE_NAMES.length - inserted} ya existían.`);
  await seedAdmin();
}

main()
  .catch((err) => {
    console.error(`Error en el seed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
