// Crea la aplicación Express sin abrir el puerto, para poder usarla en las pruebas.
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { createApiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (ENV.CORS_ORIGIN) app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
  app.use('/api', createApiRouter());
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
