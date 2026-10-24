// Carrusel "Más de <género>" al pie del detalle de un libro, sin el propio libro.
import { useCallback } from 'react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { listBooks } from '../services/booksService.js';
import { BookShelf, ShelfAction } from './BookShelf.jsx';

const SHELF_SIZE = 12;

/** @param {{genre: {name: string, slug: string}, excludeId: string}} props */
export function GenreShelf({ genre, excludeId }) {
  const fetcher = useCallback(
    // Se pide uno más por si el libro actual está entre ellos.
    () => listBooks({ genre: genre.slug, limit: SHELF_SIZE + 1 }),
    [genre.slug],
  );
  const { data, error } = useApiQuery(fetcher);
  // Es un extra: si falla, el detalle sigue sin esta sección.
  if (error) return null;

  const items = data?.items
    .filter((book) => book.id !== excludeId)
    .slice(0, SHELF_SIZE)
    .map((book) => ({ book }));

  return (
    <BookShelf
      tone="muted"
      title={`Más de ${genre.name}`}
      items={items}
      actions={<ShelfAction to={`/?genre=${genre.slug}`}>Ver más de {genre.name}</ShelfAction>}
    />
  );
}
