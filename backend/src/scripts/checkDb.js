// Diagnóstico de la conexión: ping, replica set, transacciones y conteo de colecciones.
// No escribe nada en la base de datos.
import mongoose from 'mongoose';
import { connectDb, describeConnection, disconnectDb } from '../config/db.js';
import { ALL_MODELS } from '../models/index.js';
import { runInTransaction } from '../services/transaction.js';

async function main() {
  const started = Date.now();
  await connectDb();
  console.info(`✔ Conectado a ${describeConnection()} en ${Date.now() - started} ms`);

  const db = mongoose.connection.db;
  await db.admin().command({ ping: 1 });
  console.info('✔ ping correcto');

  const hello = await db.admin().command({ hello: 1 });
  if (!hello.setName) {
    console.warn('✘ El servidor no es un replica set: las transacciones no funcionarán.');
    process.exitCode = 1;
    return;
  }
  console.info(`✔ Replica set: ${hello.setName}`);

  // Transacción de solo lectura para comprobar que el clúster las admite.
  await runInTransaction((session) => ALL_MODELS[0].findOne().session(session));
  console.info('✔ Transacciones disponibles');

  for (const model of ALL_MODELS) {
    const count = await model.estimatedDocumentCount();
    console.info(`  ${model.collection.name}: ${count} documentos`);
  }
}

main()
  .catch((err) => {
    // Solo el mensaje: la cadena de conexión puede contener credenciales.
    console.error(`✘ Error de conexión: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
