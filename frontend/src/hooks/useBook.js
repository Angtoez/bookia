// Detalle de un libro con su disponibilidad; un 404 (o un id mal formado) es `notFound`.
import { useCallback } from 'react';
import { getBook } from '../services/booksService.js';
import { useApiQuery } from './useApiQuery.js';

export function useBook(id) {
  const fetcher = useCallback(() => getBook(id), [id]);
  const { data, error, loading, reload } = useApiQuery(fetcher);
  const notFound = error?.status === 404 || error?.status === 400;
  return {
    book: loading ? null : (data ?? null),
    loading,
    error: notFound ? null : error,
    notFound,
    reload,
  };
}
