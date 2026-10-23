// Detalle público de un libro y su disponibilidad en cada tienda (US1, escenarios 4 y 5), con el
// botón Reservar de cada tienda (US5).
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BookCover } from '../components/BookCover.jsx';
import { BookDetailSkeleton } from '../components/BookSkeletons.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { FavoriteButton } from '../components/FavoriteButton.jsx';
import { Notice } from '../components/Notice.jsx';
import { ReserveButton } from '../components/ReserveButton.jsx';
import { StoreAvailabilityList } from '../components/StoreAvailabilityList.jsx';
import { useBook } from '../hooks/useBook.js';
import { useConfig } from '../hooks/useConfig.js';
import { formatPrice } from '../utils/formatPrice.js';
import { NotFoundPage } from './NotFoundPage.jsx';

function Detail({ term, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{term}</dt>
      <dd className="text-stone-900">{children}</dd>
    </div>
  );
}

export function BookDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  // BookCard pasa la búsqueda del catálogo para volver a la misma página de resultados.
  const catalogSearch = location.state?.catalogSearch;
  const backTo =
    typeof catalogSearch === 'string' && catalogSearch.startsWith('?') ? `/${catalogSearch}` : '/';
  const { book, error, notFound, reload } = useBook(id);
  const config = useConfig();
  const [reserved, setReserved] = useState(null);

  useEffect(() => {
    if (book) document.title = `${book.title} · Bookia`;
  }, [book]);

  if (notFound) return <NotFoundPage message="Este libro no existe o se ha eliminado." />;
  if (error && !book) return <ErrorMessage error={error} onRetry={reload} />;
  if (!book) return <BookDetailSkeleton label="Cargando el libro…" />;

  const handleReserved = (reservation) => {
    setReserved(reservation);
    // Las unidades disponibles han cambiado.
    reload();
  };

  return (
    <article className="space-y-8">
      <Link
        to={backTo}
        className="inline-block rounded-sm text-sm font-medium text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        ← Volver al catálogo
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <BookCover book={book} size="lg" />
        <div className="flex-1 space-y-2">
          {book.genre && (
            <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
              {book.genre.name}
            </p>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-stone-900">{book.title}</h1>
              <p className="text-lg text-stone-700">{book.author}</p>
            </div>
            <FavoriteButton book={book} />
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail term="ISBN">{book.isbn}</Detail>
        <Detail term="Precio de referencia">
          {formatPrice(book.price_cents, config?.currency)}
        </Detail>
        {book.publisher && <Detail term="Editorial">{book.publisher}</Detail>}
        {book.publication_year && <Detail term="Año">{book.publication_year}</Detail>}
      </dl>

      {book.description && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-900">Descripción</h2>
          <p className="leading-relaxed whitespace-pre-line text-stone-800">{book.description}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Dónde encontrarlo</h2>
        <Notice
          message={
            reserved && (
              <>
                Has reservado «{reserved.book_title}» en {reserved.store_name}. Puedes seguirla en{' '}
                <Link to="/me/reservations" className="font-medium underline underline-offset-2">
                  Mis reservas
                </Link>
                .
              </>
            )
          }
          onDismiss={() => setReserved(null)}
        />
        {book.stores.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            Este libro no está disponible en ningún establecimiento.
          </p>
        ) : (
          <StoreAvailabilityList
            stores={book.stores}
            currency={config?.currency}
            renderActions={(store) => (
              <ReserveButton
                book={book}
                store={store}
                config={config}
                onReserved={handleReserved}
              />
            )}
          />
        )}
      </section>
    </article>
  );
}
