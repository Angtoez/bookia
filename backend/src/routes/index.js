// Monta todos los routers de la API bajo /api.
import { Router } from 'express';
import { createAuthRouter } from './authRoutes.js';
import { createBooksRouter } from './booksRoutes.js';
import { createConfigRouter } from './configRoutes.js';
import { createFavoritesRouter } from './favoritesRoutes.js';
import { createReservationsRouter } from './reservationsRoutes.js';
import { createStoresRouter } from './storesRoutes.js';

export function createApiRouter() {
  const router = Router();
  router.use('/auth', createAuthRouter());
  router.use('/', createConfigRouter());
  router.use('/books', createBooksRouter());
  router.use('/stores', createStoresRouter());
  router.use('/reservations', createReservationsRouter());
  router.use('/favorites', createFavoritesRouter());
  return router;
}
