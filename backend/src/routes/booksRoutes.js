import { Router } from 'express';
import {
  createBook,
  deleteBook,
  getDeletionImpact,
  updateBook,
} from '../controllers/adminBooksController.js';
import { getBook, listBooks } from '../controllers/booksController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import {
  createBookSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '../validators/bookValidators.js';
import { idParamSchema } from '../validators/common.js';

export function createBooksRouter() {
  const router = Router();
  const admin = [authenticate, requireRole('admin')];

  // Catálogo público; con sesión añade is_favorite.
  router.get('/', optionalAuthenticate, validate({ query: listBooksQuerySchema }), listBooks);
  router.get('/:id', optionalAuthenticate, validate({ params: idParamSchema }), getBook);

  // Gestión (solo administradores).
  router.post('/', ...admin, validate({ body: createBookSchema }), createBook);
  router.patch(
    '/:id',
    ...admin,
    validate({ params: idParamSchema, body: updateBookSchema }),
    updateBook,
  );
  router.get(
    '/:id/deletionImpact',
    ...admin,
    validate({ params: idParamSchema }),
    getDeletionImpact,
  );
  router.delete('/:id', ...admin, validate({ params: idParamSchema }), deleteBook);
  return router;
}
