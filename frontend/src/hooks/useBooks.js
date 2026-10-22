// Catálogo con su estado en la URL (q, genre y page), para compartir búsquedas y usar Atrás.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { listBooks } from '../services/booksService.js';
import { applyParamChanges, readPage } from '../utils/searchParams.js';
import { useApiQuery } from './useApiQuery.js';

export function useBooks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const genre = searchParams.get('genre') ?? '';
  const page = readPage(searchParams.get('page'));

  const fetcher = useCallback(
    () => listBooks({ q: q.trim() || undefined, genre: genre || undefined, page }),
    [q, genre, page],
  );
  const { data, error, loading, reload } = useApiQuery(fetcher);

  /** Cambia parámetros de la URL; cambiar q o genre vuelve a la primera página. */
  const setParams = useCallback(
    (changes) => setSearchParams((prev) => applyParamChanges(prev, changes)),
    [setSearchParams],
  );

  const clearFilters = useCallback(() => setSearchParams({}), [setSearchParams]);

  return {
    params: { q, genre, page },
    data,
    error,
    loading,
    reload,
    setParams,
    clearFilters,
  };
}
