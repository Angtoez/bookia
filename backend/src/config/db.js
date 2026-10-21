// Conexión única a MongoDB (principio IV): se abre al arrancar y se cierra al terminar.
import mongoose from 'mongoose';
import { ENV } from './env.js';

// Segunda barrera contra la inyección de operadores (research R5).
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

/**
 * Conecta Mongoose a MongoDB. Si ya hay una conexión abierta, la reutiliza.
 * @param {string} [uri] cadena de conexión; por defecto, MONGODB_URI.
 * @param {object} [options] opciones extra de mongoose.connect.
 */
export async function connectDb(uri = ENV.MONGODB_URI, options = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri, {
    dbName: ENV.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10000,
    ...options,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

/** Describe la conexión sin exponer credenciales. */
export function describeConnection() {
  const { host, name } = mongoose.connection;
  return `${host}/${name}`;
}
