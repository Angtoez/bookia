// Tarjeta de un libro: toda la tarjeta enlaza a su detalle, salvo el corazón de favoritos,
// que queda por encima del enlace.
import { Link, useLocation } from 'react-router';
import { formatPrice } from '../utils/formatPrice.js';
import { FavoriteButton } from './FavoriteButton.jsx';

/**
 * @param {{book: object, currency?: string, onFavoriteChange?: (isFavorite: boolean) => void,
 *   children?: React.ReactNode}} props
 *   children: información extra al pie (p. ej. la disponibilidad en Mis favoritos).
 */
export function BookCard({ book, currency, onFavoriteChange, children }) {
  const { pathname, search } = useLocation();
  // Solo el catálogo guarda su búsqueda para el enlace "Volver al catálogo" del detalle.
  const state = pathname === '/' && search ? { catalogSearch: search } : undefined;
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-teal-600 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="pt-2 text-xs font-semibold tracking-wide text-teal-700 uppercase">
          {book.genre?.name}
        </p>
        <FavoriteButton book={book} onChange={onFavoriteChange} />
      </div>
      <h2 className="text-lg leading-snug font-semibold text-stone-900">
        <Link
          to={`/books/${book.id}`}
          state={state}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {book.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-stone-600">{book.author}</p>
      <p className="mt-auto pt-4 text-base font-semibold text-stone-900">
        {formatPrice(book.price_cents, currency)}
      </p>
      {children}
    </article>
  );
}
