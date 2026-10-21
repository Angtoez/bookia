// Base de datos en memoria como replica set de un nodo, para poder usar transacciones.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { ALL_MODELS, syncAllIndexes } from '../../src/models/index.js';

let replSet;

export async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDb(replSet.getUri(), { dbName: 'bookia_test' });
  await syncAllIndexes();
}

/** Vacía todas las colecciones. Usa el driver directamente para saltarse los hooks
 * que hacen inmutable audit_logs. */
export async function clearDb() {
  for (const model of ALL_MODELS) await model.collection.deleteMany({});
}

export async function stopDb() {
  await disconnectDb();
  await replSet?.stop();
}
