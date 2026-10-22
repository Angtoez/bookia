// Textos de los estados y motivos de cancelación de una reserva (data-model § Reservation).

export const RESERVATION_STATUSES = ['pending', 'ready', 'picked_up', 'cancelled', 'expired'];

const STATUS_LABELS = {
  pending: 'Pendiente',
  ready: 'Lista para recoger',
  picked_up: 'Recogida',
  cancelled: 'Cancelada',
  expired: 'Caducada',
};

export const reservationStatusLabel = (status) => STATUS_LABELS[status] ?? status;

export const isActiveReservation = (reservation) =>
  reservation.status === 'pending' || reservation.status === 'ready';

// "Cancelada por ti" en Mis reservas; "por el usuario" en la gestión.
const REASON_LABELS = {
  user: { owner: 'por ti', admin: 'por el usuario' },
  admin: { owner: 'por la administración', admin: 'por la administración' },
  book_deleted: { owner: 'libro retirado', admin: 'libro retirado' },
  store_deleted: { owner: 'establecimiento cerrado', admin: 'establecimiento cerrado' },
  account_deactivated: { owner: 'cuenta desactivada', admin: 'cuenta desactivada' },
};

/** @param {'owner'|'admin'} [viewer] quién lee el motivo. */
export function cancelReasonLabel(reason, viewer = 'owner') {
  return REASON_LABELS[reason]?.[viewer] ?? null;
}
