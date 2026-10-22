// Marca o desmarca un libro como favorito con actualización optimista: el corazón cambia al
// instante y vuelve atrás si la API falla (US6).
import { useCallback, useRef, useState } from 'react';
import { addFavorite, removeFavorite } from '../services/favoritesService.js';

/**
 * @param {string} bookId
 * @param {boolean} initial valor de is_favorite que trae la API.
 * @param {(isFavorite: boolean) => void} [onChange] se llama cuando la API confirma el cambio.
 */
export function useFavoriteToggle(bookId, initial, onChange) {
  const [isFavorite, setIsFavorite] = useState(Boolean(initial));
  const [lastInitial, setLastInitial] = useState(Boolean(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  // Evita que dos pulsaciones rápidas lancen peticiones contradictorias.
  const busy = useRef(false);

  // Si la API trae otro valor (recarga del listado), manda el servidor.
  if (Boolean(initial) !== lastInitial) {
    setLastInitial(Boolean(initial));
    setIsFavorite(Boolean(initial));
  }

  const toggle = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !isFavorite;
    setIsFavorite(next);
    setPending(true);
    setError(null);
    try {
      await (next ? addFavorite(bookId) : removeFavorite(bookId));
      onChange?.(next);
    } catch (err) {
      setIsFavorite(!next);
      setError(err);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [bookId, isFavorite, onChange]);

  return { isFavorite, pending, error, toggle };
}
