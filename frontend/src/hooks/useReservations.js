// Listado de reservas con status (y store_id para la gestión) y page en la URL.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { listMyReservations, listReservations } from '../services/reservationsService.js';
import { applyParamChanges, readPage } from '../utils/searchParams.js';
import { RESERVATION_STATUSES } from '../utils/reservationStatusLabel.js';
import { useApiQuery } from './useApiQuery.js';

/** @param {{admin?: boolean}} [options] admin: todas las reservas (con filtro por tienda). */
export function useReservations({ admin = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get('status') ?? '';
  // Un estado desconocido en la URL se ignora en lugar de provocar un 400.
  const status = RESERVATION_STATUSES.includes(rawStatus) ? rawStatus : '';
  const storeId = admin ? (searchParams.get('store_id') ?? '') : '';
  const page = readPage(searchParams.get('page'));

  const fetcher = useCallback(() => {
    const query = { status: status || undefined, page };
    if (admin) return listReservations({ ...query, store_id: storeId || undefined });
    return listMyReservations(query);
  }, [admin, status, storeId, page]);
  const { data, error, loading, reload } = useApiQuery(fetcher);

  const setParams = useCallback(
    (changes) => setSearchParams((prev) => applyParamChanges(prev, changes)),
    [setSearchParams],
  );

  return {
    params: { status, store_id: storeId, page },
    data,
    items: data?.items ?? [],
    error,
    loading,
    reload,
    setParams,
  };
}
