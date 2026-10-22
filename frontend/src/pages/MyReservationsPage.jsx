// "Mis reservas": estado, fechas y cancelación de las reservas propias (US5, FR-022g).
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { Notice } from '../components/Notice.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useConfig } from '../hooks/useConfig.js';
import { useReservations } from '../hooks/useReservations.js';
import { cancelReservation } from '../services/reservationsService.js';
import { formatDateTime } from '../utils/formatDate.js';
import { formatPrice } from '../utils/formatPrice.js';
import {
  RESERVATION_STATUSES,
  cancelReasonLabel,
  isActiveReservation,
  reservationStatusLabel,
} from '../utils/reservationStatusLabel.js';

/** Fecha que importa según el estado: el plazo si está activa y el cierre si ya no. */
function DeadlineLine({ reservation }) {
  const { status, expires_at: expiresAt, closed_at: closedAt } = reservation;
  if (status === 'ready' && expiresAt) {
    return (
      <p className="font-medium text-sky-900">Recógela antes del {formatDateTime(expiresAt)}</p>
    );
  }
  if (status === 'pending' && expiresAt) {
    return <p>La tienda la preparará antes del {formatDateTime(expiresAt)}</p>;
  }
  if (isActiveReservation(reservation)) return null;
  const reason =
    status === 'cancelled' ? cancelReasonLabel(reservation.cancel_reason, 'owner') : null;
  return (
    <p>
      {reservationStatusLabel(status)}
      {closedAt ? ` el ${formatDateTime(closedAt)}` : ''}
      {reason ? ` (${reason})` : ''}
    </p>
  );
}

export function MyReservationsPage() {
  const { params, data, items, error, loading, reload, setParams } = useReservations();
  const config = useConfig();
  const filterId = useId();
  const [notice, setNotice] = useState(null);
  // {reservation, busy?, error?}: la reserva que se va a cancelar.
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    document.title = 'Mis reservas · Bookia';
  }, []);

  const confirmCancel = async () => {
    const { reservation } = cancelling;
    setCancelling({ reservation, busy: true });
    try {
      await cancelReservation(reservation.id);
      setCancelling(null);
      setNotice(`Has cancelado la reserva de «${reservation.book_title}».`);
    } catch (err) {
      // 409 INVALID_TRANSITION: ha cambiado de estado mientras tanto (p. ej. ha caducado).
      setCancelling({ reservation, error: err });
    }
    reload();
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando tus reservas…" />;
  else if (items.length === 0) {
    content = (
      <div className="space-y-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        <p>
          {params.status
            ? 'No tienes reservas en este estado.'
            : 'Todavía no has reservado ningún libro.'}
        </p>
        <Link
          to="/"
          className="inline-block font-medium text-teal-800 underline underline-offset-2"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  } else {
    content = (
      <>
        <ul aria-busy={loading} className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
          {items.map((reservation) => (
            <li
              key={reservation.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1 text-sm text-stone-700">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-stone-900">
                    <Link to={`/books/${reservation.book_id}`} className="hover:underline">
                      {reservation.book_title}
                    </Link>
                  </h2>
                  <StatusBadge status={reservation.status} />
                </div>
                <p>
                  {reservation.store_name} · {reservation.store_address}
                </p>
                <p>
                  {formatPrice(reservation.price_cents, config?.currency)} · reservada el{' '}
                  {formatDateTime(reservation.created_at)}
                </p>
                <DeadlineLine reservation={reservation} />
              </div>
              {isActiveReservation(reservation) && (
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setCancelling({ reservation });
                  }}
                  aria-label={`Cancelar la reserva de «${reservation.book_title}»`}
                  className="self-start rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          onPageChange={(page) => setParams({ page })}
        />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Mis reservas</h1>
        <div className="space-y-1">
          <label htmlFor={filterId} className="block text-sm font-medium text-stone-800">
            Estado
          </label>
          <select
            id={filterId}
            value={params.status}
            onChange={(event) => setParams({ status: event.target.value })}
            className="block rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
          >
            <option value="">Todos</option>
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {reservationStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      {content}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={cancelling ? `¿Cancelar la reserva de «${cancelling.reservation.book_title}»?` : ''}
        confirmLabel="Cancelar reserva"
        cancelLabel="Volver"
        tone="danger"
        busy={Boolean(cancelling?.busy)}
        confirmDisabled={Boolean(cancelling?.error)}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      >
        <p>La unidad volverá a estar disponible para otras personas.</p>
        <ErrorMessage error={cancelling?.error} />
      </ConfirmDialog>
    </section>
  );
}
