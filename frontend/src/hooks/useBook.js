// Detalle de un libro con su disponibilidad; un 404 (o un id mal formado) es `notFound`.
// Al recargar el mismo libro (p. ej. tras reservar) conserva los datos anteriores, para que la
// página no vuelva al indicador de carga; si cambia el id, no muestra el libro anterior.
import { useCallback } from 'react';
import { getBook } from '../services/booksService.js';
import { useApiQuery } from './useApiQuery.js';

export function useBook(id) {
  const fetcher = useCallback(() => getBook(id), [id]);
  const { data, error, loading, reload } = useApiQuery(fetcher);
  const notFound = error?.status === 404 || error?.status === 400;
  return {
    book: data?.id === id ? data : null,
    loading,
    error: notFound ? null : error,
    notFound,
    reload,
  };
}
