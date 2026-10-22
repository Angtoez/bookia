// Catálogo con su estado en la URL (q, genre y page), para compartir búsquedas y usar Atrás.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { listBooks } from '../services/booksService.js';
import { useApiQuery } from './useApiQuery.js';

function readPage(value) {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

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
    (changes) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          const empty = value === '' || value == null || (key === 'page' && value === 1);
          if (empty) next.delete(key);
          else next.set(key, String(value));
        }
        if (!('page' in changes) && ('q' in changes || 'genre' in changes)) next.delete('page');
        return next;
      });
    },
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
