// Gestión de reservas: filtro por estado y tienda, y cambios de estado con confirmación (US5).
import { useEffect, useId, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { Notice } from '../../components/Notice.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useReservations } from '../../hooks/useReservations.js';
import { cancelReservation, markPickedUp, markReady } from '../../services/reservationsService.js';
import { listStores } from '../../services/storesService.js';
import { formatDateTime } from '../../utils/formatDate.js';
import {
  RESERVATION_STATUSES,
  cancelReasonLabel,
  reservationStatusLabel,
} from '../../utils/reservationStatusLabel.js';

// Reserva de una cuenta que se borró: la API devuelve user null (feature 002).
const DELETED_ACCOUNT = 'Cuenta eliminada';

// Acciones posibles en cada estado (data-model § Transiciones de estado).
const ACTIONS = {
  ready: {
    label: 'Marcar lista',
    run: markReady,
    from: ['pending'],
    question: '¿Marcar como lista para recoger?',
    explain: 'Empezará a contar el plazo de recogida.',
    done: 'lista para recoger',
  },
  pickup: {
    label: 'Marcar recogida',
    run: markPickedUp,
    from: ['ready'],
    question: '¿Marcar como recogida?',
    explain: 'La unidad se descontará del stock de la tienda.',
    done: 'recogida',
  },
  cancel: {
    label: 'Cancelar',
    run: cancelReservation,
    from: ['pending', 'ready'],
    question: '¿Cancelar la reserva?',
    explain: 'La unidad volverá a estar disponible.',
    done: 'cancelada',
  },
};

const SELECT =
  'block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-700';

// La API admite hasta 50 por página; basta para el selector de tiendas.
const fetchStoreOptions = () => listStores({ limit: 50 });

function dateLines(reservation) {
  const lines = [`Creada: ${formatDateTime(reservation.created_at)}`];
  if (reservation.ready_at) lines.push(`Lista: ${formatDateTime(reservation.ready_at)}`);
  if (reservation.expires_at) lines.push(`Vence: ${formatDateTime(reservation.expires_at)}`);
  if (reservation.closed_at) lines.push(`Cerrada: ${formatDateTime(reservation.closed_at)}`);
  return lines;
}

export function AdminReservationsPage() {
  const { params, data, items, error, loading, reload, setParams } = useReservations({
    admin: true,
  });
  const { data: stores } = useApiQuery(fetchStoreOptions);
  const statusId = useId();
  const storeId = useId();
  const [notice, setNotice] = useState(null);
  // {reservation, action, busy?, error?}: el cambio de estado pendiente de confirmar.
  const [pending, setPending] = useState(null);

  useEffect(() => {
    document.title = 'Reservas · Administración · Bookia';
  }, []);

  const confirm = async () => {
    const { reservation, action } = pending;
    setPending({ reservation, action, busy: true });
    try {
      await ACTIONS[action].run(reservation.id);
      setPending(null);
      setNotice(`La reserva de «${reservation.book_title}» está ${ACTIONS[action].done}.`);
    } catch (err) {
      // 409 INVALID_TRANSITION: otra persona (o la caducidad) cambió el estado antes.
      setPending({ reservation, action, error: err });
    }
    reload();
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando las reservas…" />;
  else if (items.length === 0) {
    content = (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        No hay reservas con estos filtros.
      </p>
    );
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-busy={loading} className="w-full min-w-[56rem] text-left text-sm">
            <caption className="sr-only">Reservas</caption>
            <thead className="bg-stone-100 text-xs tracking-wide text-stone-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Libro
                </th>
                <th scope="col" className="px-4 py-3">
                  Usuario
                </th>
                <th scope="col" className="px-4 py-3">
                  Tienda
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Fechas
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-200 align-top ${loading ? 'opacity-60' : ''}`}>
              {items.map((reservation) => {
                const reason = cancelReasonLabel(reservation.cancel_reason, 'admin');
                const available = Object.entries(ACTIONS).filter(([, a]) =>
                  a.from.includes(reservation.status),
                );
                return (
                  <tr key={reservation.id}>
                    <th scope="row" className="px-4 py-3 font-medium text-stone-900">
                      {reservation.book_title}
                    </th>
                    <td className="px-4 py-3 text-stone-700">
                      {reservation.user ? (
                        <>
                          <span className="block">{reservation.user.name}</span>
                          <span className="block text-xs text-stone-500">
                            {reservation.user.email}
                          </span>
                        </>
                      ) : (
                        <span className="text-stone-500 italic">{DELETED_ACCOUNT}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{reservation.store_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={reservation.status} />
                      {reason && (
                        <span className="mt-1 block text-xs text-stone-600">{reason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-stone-600">
                      {dateLines(reservation).map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {available.map(([key, action]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setPending({ reservation, action: key });
                            }}
                            aria-label={`${action.label}: reserva de «${reservation.book_title}» de ${reservation.user?.name ?? DELETED_ACCOUNT}`}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              key === 'cancel'
                                ? 'border-red-300 text-red-800 hover:bg-red-50 focus-visible:outline-red-700'
                                : 'border-primary-700 text-primary-900 hover:bg-primary-50 focus-visible:outline-primary-700'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          onPageChange={(page) => setParams({ page })}
        />
      </>
    );
  }

  const action = pending && ACTIONS[pending.action];
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Reservas</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <div className="space-y-1">
          <label htmlFor={statusId} className="block text-sm font-medium text-stone-800">
            Estado
          </label>
          <select
            id={statusId}
            value={params.status}
            onChange={(e) => setParams({ status: e.target.value })}
            className={SELECT}
          >
            <option value="">Todos</option>
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {reservationStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={storeId} className="block text-sm font-medium text-stone-800">
            Establecimiento
          </label>
          <select
            id={storeId}
            value={params.store_id}
            onChange={(e) => setParams({ store_id: e.target.value })}
            className={SELECT}
          >
            <option value="">Todos</option>
            {(stores?.items ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      {content}

      <ConfirmDialog
        open={Boolean(pending)}
        title={action?.question ?? ''}
        confirmLabel={action?.label}
        cancelLabel="Volver"
        tone={pending?.action === 'cancel' ? 'danger' : 'default'}
        busy={Boolean(pending?.busy)}
        confirmDisabled={Boolean(pending?.error)}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <p>
            Reserva de «{pending.reservation.book_title}» de{' '}
            {pending.reservation.user?.name ?? DELETED_ACCOUNT} en {pending.reservation.store_name}.{' '}
            {action.explain}
          </p>
        )}
        <ErrorMessage error={pending?.error} />
      </ConfirmDialog>
    </section>
  );
}
