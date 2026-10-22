// Reservas: las del usuario y su gestión por el administrador (US5, contracts/rest-api.md).
import {
  createReservation,
  listAllReservations,
  listUserReservations,
  toPublic,
  transition,
} from '../services/reservationService.js';

const toPage = (page) => ({ ...page, items: page.items.map(toPublic) });

export async function create(req, res) {
  const { book_id: bookId, store_id: storeId } = req.validated.body;
  const reservation = await createReservation({ user: req.user, bookId, storeId });
  res.status(201).json(toPublic(reservation));
}

export async function listMine(req, res) {
  res.json(toPage(await listUserReservations(req.user._id, req.validated.query)));
}

/** El titular o un administrador; el servicio responde 403 a cualquier otro. */
export async function cancel(req, res) {
  const reservation = await transition(req.validated.params.id, 'cancelled', { actor: req.user });
  res.json(toPublic(reservation));
}

export async function listAll(req, res) {
  res.json(toPage(await listAllReservations(req.validated.query)));
}

export async function markReady(req, res) {
  const reservation = await transition(req.validated.params.id, 'ready', { actor: req.user });
  res.json(toPublic(reservation));
}

export async function markPickedUp(req, res) {
  const reservation = await transition(req.validated.params.id, 'picked_up', { actor: req.user });
  res.json(toPublic(reservation));
}
