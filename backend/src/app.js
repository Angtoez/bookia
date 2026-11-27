// Crea la aplicación Express sin abrir el puerto, para poder usarla en las pruebas.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { createApiRouter } from './routes/index.js';

const FRONTEND_DIST = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

// Las portadas salen de Open Library, que redirige las imágenes a archive.org y de ahí a
// sus servidores (ia*.us.archive.org). El comodín *.archive.org no incluye el dominio raíz.
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      'img-src': [
        "'self'",
        'data:',
        'https://covers.openlibrary.org',
        'https://archive.org',
        'https://*.archive.org',
      ],
    },
  },
};

// Sirve la SPA compilada y devuelve index.html en sus rutas, para que React Router las resuelva.
function serveFrontend(app) {
  if (!existsSync(FRONTEND_DIST)) {
    console.warn(`SERVE_FRONTEND=true, pero no existe ${FRONTEND_DIST}: ejecuta "npm run build"`);
    return;
  }
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    res.sendFile(join(FRONTEND_DIST, 'index.html'));
  });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (ENV.TRUST_PROXY) app.set('trust proxy', ENV.TRUST_PROXY);
  app.use(helmet(helmetOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (ENV.CORS_ORIGIN) app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
  app.use('/api', createApiRouter());
  if (ENV.SERVE_FRONTEND) serveFrontend(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
