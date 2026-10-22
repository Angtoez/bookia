// Reservas (contracts/rest-api.md § Reservas). Todas exigen sesión; las de gestión, rol admin.
import { Router } from 'express';
import {
  cancel,
  create,
  listAll,
  listMine,
  markPickedUp,
  markReady,
} from '../controllers/reservationsController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  createReservationSchema,
  listMyReservationsQuerySchema,
  listReservationsQuerySchema,
} from '../validators/reservationValidators.js';

export function createReservationsRouter() {
  const router = Router();
  const anyUser = [authenticate, requireRole('user', 'admin')];
  const adminOnly = [authenticate, requireRole('admin')];

  router.post('/', anyUser, validate({ body: createReservationSchema }), create);
  router.get('/mine', anyUser, validate({ query: listMyReservationsQuerySchema }), listMine);
  router.post('/:id/cancel', anyUser, validate({ params: idParamSchema }), cancel);

  router.get('/', adminOnly, validate({ query: listReservationsQuerySchema }), listAll);
  router.post('/:id/ready', adminOnly, validate({ params: idParamSchema }), markReady);
  router.post('/:id/pickup', adminOnly, validate({ params: idParamSchema }), markPickedUp);
  return router;
}
