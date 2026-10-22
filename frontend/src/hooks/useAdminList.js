// Tablas de administración: listado paginado con `q` y `page` en la URL.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { applyParamChanges, readPage } from '../utils/searchParams.js';
import { useApiQuery } from './useApiQuery.js';

/**
 * @param {(params: {q?: string, page: number}) => Promise<object>} fetchPage
 *   función estable (definida fuera del componente o memorizada) que pide una página.
 */
export function useAdminList(fetchPage) {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const page = readPage(searchParams.get('page'));

  const fetcher = useCallback(
    () => fetchPage({ q: q.trim() || undefined, page }),
    [fetchPage, q, page],
  );
  const { data, error, loading, reload } = useApiQuery(fetcher);

  const setQuery = useCallback(
    (value) => setSearchParams((prev) => applyParamChanges(prev, { q: value })),
    [setSearchParams],
  );
  const setPage = useCallback(
    (value) => setSearchParams((prev) => applyParamChanges(prev, { page: value })),
    [setSearchParams],
  );

  return { q, page, data, error, loading, reload, setQuery, setPage };
}
