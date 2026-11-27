// Detalle público de un libro y su disponibilidad en cada tienda (US1, escenarios 4 y 5), con el
// botón Reservar de cada tienda (US5). En escritorio, tres columnas: portada, información
// (sinopsis y ficha técnica) y la caja "Dónde encontrarlo", fija al hacer scroll. En móvil se
// apilan con la disponibilidad justo después del título. Al pie, más libros del mismo género.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BookAvailabilityBox } from '../components/BookAvailabilityBox.jsx';
import { BookCover } from '../components/BookCover.jsx';
import { BookDetailSkeleton } from '../components/BookSkeletons.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { FavoriteButton } from '../components/FavoriteButton.jsx';
import { GenreShelf } from '../components/GenreShelf.jsx';
import { Notice } from '../components/Notice.jsx';
import { ReserveButton } from '../components/ReserveButton.jsx';
import { StarRating, formatRating } from '../components/StarRating.jsx';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useBook } from '../hooks/useBook.js';
import { useConfig } from '../hooks/useConfig.js';
import { getBookRating } from '../services/reviewsService.js';
import { formatPrice } from '../utils/formatPrice.js';
import { NotFoundPage } from './NotFoundPage.jsx';

const LINK =
  'rounded-sm hover:text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700';

// Áreas de la rejilla: en móvil, una columna (disponibilidad tras el título); en sm, portada y
// título lado a lado; en lg, tres columnas con la caja ocupando toda la altura a la derecha.
const GRID =
  "grid gap-x-8 gap-y-6 [grid-template-areas:'cover'_'head'_'box'_'body'] sm:grid-cols-[11rem_minmax(0,1fr)] sm:[grid-template-areas:'cover_head'_'box_box'_'body_body'] lg:grid-cols-[13rem_minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'cover_head_box'_'cover_body_box']";

function Breadcrumbs({ book, backTo }) {
  return (
    <nav aria-label="Ruta" className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-stone-600">
        <li>
          <Link to="/" className={LINK}>
            Inicio
          </Link>
        </li>
        {book.genre && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">›</span>
            <Link to={`/?genre=${book.genre.slug}`} className={LINK}>
              {book.genre.name}
            </Link>
          </li>
        )}
        <li className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="truncate font-medium text-stone-900">
            {book.title}
          </span>
        </li>
      </ol>
      {backTo !== '/' && (
        <Link to={backTo} className={`font-medium text-primary-800 ${LINK}`}>
          ← Volver a los resultados
        </Link>
      )}
    </nav>
  );
}

/** Estrellas del libro si tiene valoraciones (de momento, las de reviewsService). */
function BookRating({ isbn }) {
  const fetcher = useCallback(() => getBookRating(isbn), [isbn]);
  const { data: rating } = useApiQuery(fetcher);
  if (!rating) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-stone-600">
      <StarRating value={rating.average} className="size-5 text-stone-400" />
      <span className="text-base font-semibold text-stone-900">{formatRating(rating.average)}</span>
      <span>· {rating.count.toLocaleString('es')} reseñas</span>
    </p>
  );
}

function Detail({ term, children }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2 py-2">
      <dt className="text-stone-500">{term}</dt>
      <dd className="text-stone-900">{children}</dd>
    </div>
  );
}

const SECTION_TITLE = 'font-sans text-xs font-bold tracking-wider text-primary-700 uppercase';

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
    <>
      <article className="space-y-6">
        <Breadcrumbs book={book} backTo={backTo} />

        <div className={GRID}>
          <div className="space-y-3 [grid-area:cover]">
            <div className="mx-auto w-40 shadow-lg sm:w-full">
              <BookCover book={book} size="fill" />
            </div>
            {/* empty:hidden: al administrador no se le muestra el botón y no debe quedar el hueco. */}
            <div className="mx-auto w-56 empty:hidden sm:w-full">
              <FavoriteButton book={book} withLabel />
            </div>
          </div>

          <header className="space-y-2 [grid-area:head]">
            {book.genre && (
              <p className="text-sm font-semibold tracking-wide text-primary-700 uppercase">
                {book.genre.name}
              </p>
            )}
            <h1 className="text-3xl leading-tight font-bold text-stone-900 sm:text-4xl">
              {book.title}
            </h1>
            <p className="text-lg text-stone-700">{book.author}</p>
            <BookRating isbn={book.isbn} />
          </header>

          <div className="[grid-area:box] lg:sticky lg:top-24 lg:self-start">
            <BookAvailabilityBox
              stores={book.stores}
              currency={config?.currency}
              notice={
                <Notice
                  message={
                    reserved && (
                      <>
                        Has reservado «{reserved.book_title}» en {reserved.store_name}. Puedes
                        seguirla en{' '}
                        <Link
                          to="/me/reservations"
                          className="font-medium underline underline-offset-2"
                        >
                          Mis reservas
                        </Link>
                        .
                      </>
                    )
                  }
                  onDismiss={() => setReserved(null)}
                />
              }
              renderActions={(store) => (
                <ReserveButton
                  book={book}
                  store={store}
                  config={config}
                  onReserved={handleReserved}
                />
              )}
            />
          </div>

          <div className="space-y-8 [grid-area:body]">
            {book.description && (
              <section className="space-y-2">
                <h2 className={SECTION_TITLE}>Sinopsis</h2>
                <p className="max-w-prose text-lg leading-relaxed whitespace-pre-line text-stone-800">
                  {book.description}
                </p>
              </section>
            )}
            <section className="space-y-2">
              <h2 className={SECTION_TITLE}>Ficha técnica</h2>
              <dl className="max-w-md divide-y divide-stone-200 border-y border-stone-200 text-sm">
                {book.publisher && <Detail term="Editorial">{book.publisher}</Detail>}
                {book.publication_year && <Detail term="Año">{book.publication_year}</Detail>}
                <Detail term="ISBN">{book.isbn}</Detail>
                {book.genre && <Detail term="Género">{book.genre.name}</Detail>}
                <Detail term="Precio de referencia">
                  {formatPrice(book.price_cents, config?.currency)}
                </Detail>
              </dl>
            </section>
          </div>
        </div>
      </article>

      {book.genre && (
        <div className="mt-12">
          <GenreShelf genre={book.genre} excludeId={book.id} />
        </div>
      )}
    </>
  );
}
