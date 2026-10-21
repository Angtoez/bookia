// Punto de entrada: conecta a MongoDB, abre el puerto y cierra todo de forma controlada.
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { connectDb, describeConnection, disconnectDb } from './config/db.js';

async function main() {
  try {
    await connectDb();
  } catch (err) {
    // Solo el mensaje: la cadena de conexión puede contener credenciales.
    console.error(`No se pudo conectar a MongoDB: ${err.message}`);
    process.exit(1);
  }
  console.info(`MongoDB conectado (${describeConnection()})`);

  const server = createApp().listen(ENV.PORT, () => {
    console.info(`API de Bookia escuchando en http://localhost:${ENV.PORT}/api`);
  });

  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    console.info(`${signal} recibido: cerrando el servidor…`);
    server.close(async () => {
      await disconnectDb();
      console.info('Conexión a MongoDB cerrada');
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
