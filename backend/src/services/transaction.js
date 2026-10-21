// Ejecuta una función dentro de una transacción de MongoDB (research R8).
// Requiere un replica set: Atlas lo es por defecto.
import mongoose from 'mongoose';

/**
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    // withTransaction puede reintentar fn ante errores transitorios.
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
