// Puntos de venta e inventario: todas las rutas son de administración (contracts/rest-api.md).
import { Router } from 'express';
import {
  addStoreBook,
  listStoreBooks,
  removeStoreBook,
  updateStoreBook,
} from '../controllers/storeBooksController.js';
import {
  createStore,
  deleteStore,
  getDeletionImpact,
  getStore,
  listStores,
  updateStore,
} from '../controllers/storesController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.js';
import {
  createStoreSchema,
  storeBookCreateSchema,
  storeBookParamsSchema,
  storeBookUpdateSchema,
  updateStoreSchema,
} from '../validators/storeValidators.js';

export function createStoresRouter() {
  const router = Router();
  router.use(authenticate, requireRole('admin'));

  router.get('/', validate({ query: paginationQuerySchema }), listStores);
  router.post('/', validate({ body: createStoreSchema }), createStore);
  router.get('/:id', validate({ params: idParamSchema }), getStore);
  router.patch('/:id', validate({ params: idParamSchema, body: updateStoreSchema }), updateStore);
  router.get('/:id/deletionImpact', validate({ params: idParamSchema }), getDeletionImpact);
  router.delete('/:id', validate({ params: idParamSchema }), deleteStore);

  router.get(
    '/:id/books',
    validate({ params: idParamSchema, query: paginationQuerySchema }),
    listStoreBooks,
  );
  router.post(
    '/:id/books',
    validate({ params: idParamSchema, body: storeBookCreateSchema }),
    addStoreBook,
  );
  router.patch(
    '/:id/books/:bookId',
    validate({ params: storeBookParamsSchema, body: storeBookUpdateSchema }),
    updateStoreBook,
  );
  router.delete('/:id/books/:bookId', validate({ params: storeBookParamsSchema }), removeStoreBook);
  return router;
}
