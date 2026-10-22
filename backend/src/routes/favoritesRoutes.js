// Favoritos del usuario con sesión (contracts/rest-api.md § Favoritos).
import { Router } from 'express';
import { z } from 'zod';
import { addFavorite, listFavorites, removeFavorite } from '../controllers/favoritesController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema, paginationQuerySchema } from '../validators/common.js';

const bookParamsSchema = z.object({ bookId: objectIdSchema });

export function createFavoritesRouter() {
  const router = Router();
  router.use(authenticate, requireRole('user', 'admin'));

  router.get('/', validate({ query: paginationQuerySchema }), listFavorites);
  router.put('/:bookId', validate({ params: bookParamsSchema }), addFavorite);
  router.delete('/:bookId', validate({ params: bookParamsSchema }), removeFavorite);
  return router;
}
