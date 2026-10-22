// Reserva de una unidad de un libro en una tienda desde su detalle (US5).
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { createReservation } from '../services/reservationsService.js';
import { formatPrice } from '../utils/formatPrice.js';
import { plural } from '../utils/plural.js';
import { loginPathFor } from '../utils/safeNext.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

const BUTTON =
  'w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:w-auto';

/**
 * @param {{book: {id: string, title: string}, store: object, config?: object,
 *   onReserved: (reservation: object) => void}} props
 *   config: GET /api/config, para la moneda y los plazos.
 */
export function ReserveButton({ book, store, config, onReserved }) {
  const { status } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Sin unidades no hay nada que reservar (historia 5).
  if (store.is_sold_out) return null;

  if (status !== 'authenticated') {
    return (
      <Link to={loginPathFor(location)} className={`${BUTTON} text-center`}>
        Inicia sesión para reservar
      </Link>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const reservation = await createReservation({ bookId: book.id, storeId: store.store_id });
      setOpen(false);
      onReserved(reservation);
    } catch (err) {
      // 409 OUT_OF_STOCK, RESERVATION_LIMIT o DUPLICATE_RESERVATION, con el mensaje de la API.
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const pendingDays = config?.pending_ttl_days;
  const pickupDays = config?.pickup_ttl_days;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={`Reservar en ${store.name}`}
        className={BUTTON}
      >
        Reservar
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Reservar «${book.title}»?`}
        confirmLabel="Reservar"
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <p>
          Se guardará una unidad en <strong>{store.name}</strong> ({store.address}) por{' '}
          <strong>{formatPrice(store.price_cents, config?.currency)}</strong>, que pagarás al
          recogerla.
        </p>
        {pendingDays && pickupDays && (
          <p>
            La tienda tiene {plural(pendingDays, 'día')} para prepararla. Cuando esté lista, tendrás{' '}
            {plural(pickupDays, 'día')} para recogerla.
          </p>
        )}
        <ErrorMessage error={error} />
      </ConfirmDialog>
    </>
  );
}
