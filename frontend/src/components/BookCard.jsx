// Tarjeta de un libro en el catálogo: toda la tarjeta enlaza a su detalle.
import { Link, useLocation } from 'react-router';
import { formatPrice } from '../utils/formatPrice.js';

export function BookCard({ book, currency }) {
  const { search } = useLocation();
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-teal-600 hover:shadow-md">
      {book.genre && (
        <p className="mb-2 text-xs font-semibold tracking-wide text-teal-700 uppercase">
          {book.genre.name}
        </p>
      )}
      <h2 className="text-lg leading-snug font-semibold text-stone-900">
        <Link
          to={`/books/${book.id}`}
          state={search ? { catalogSearch: search } : undefined}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {book.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-stone-600">{book.author}</p>
      <p className="mt-auto pt-4 text-base font-semibold text-stone-900">
        {formatPrice(book.price_cents, currency)}
      </p>
    </article>
  );
}
