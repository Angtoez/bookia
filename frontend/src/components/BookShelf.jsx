// Sección de portada a todo lo ancho con un carrusel de libros: título centrado, portadas con
// etiqueta, flechas a los lados, puntos de página y botones al pie. Scroll nativo con snap: se
// desliza con el dedo, la rueda o las flechas, sin avance automático.
import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BookCover } from './BookCover.jsx';

const ARROW = { prev: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7' };
// Hueco entre tarjetas (gap-6): cuenta para saber dónde empieza cada página.
const GAP_PX = 24;

function ArrowButton({ direction, disabled, controls, onClick }) {
  const side = direction === 'prev' ? '-left-3 xl:-left-12' : '-right-3 xl:-right-12';
  return (
    <button
      type="button"
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white text-primary-700 shadow-md ring-1 ring-stone-200 transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:pointer-events-none disabled:opacity-0 sm:grid ${side}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 fill-none stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ARROW[direction]} />
      </svg>
      <span className="sr-only">{direction === 'prev' ? 'Anteriores' : 'Siguientes'}</span>
    </button>
  );
}

/** Tarjeta: un único enlace al detalle, con la portada, el título, el autor y la llamada. */
function ShelfCard({ book, badge, meta }) {
  return (
    <Link
      to={`/books/${book.id}`}
      className="group flex h-full flex-col rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-700"
    >
      <div className="relative pt-5">
        {badge && (
          <span className="absolute top-0 left-0 rounded-t-sm bg-primary-700 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-white uppercase">
            {badge}
          </span>
        )}
        <div className="shadow-md transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <BookCover book={book} size="fill" />
        </div>
      </div>
      <h3 className="mt-3 line-clamp-2 text-[0.95rem] leading-snug font-bold text-stone-900 group-hover:text-primary-700">
        {book.title}
      </h3>
      <p className="mt-1 truncate text-sm text-primary-700">{book.author}</p>
      {meta && <div className="mt-1 text-sm text-stone-600">{meta}</div>}
      <span className="mt-auto self-start pt-3">
        <span className="inline-block rounded-md bg-primary-600 px-3 py-1 text-sm font-bold text-white transition group-hover:bg-primary-700">
          Ver disponibilidad
        </span>
      </span>
    </Link>
  );
}

function ShelfSkeleton() {
  return (
    <ul aria-hidden="true" className="flex gap-6 overflow-hidden pt-5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="w-[40%] shrink-0 space-y-3 sm:w-44 lg:w-[calc((100%-7.5rem)/6)]">
          <div className="aspect-[2/3] animate-pulse rounded-md bg-stone-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200" />
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{id?: string, title: string, subtitle?: string, tone?: 'white'|'muted',
 *   items?: {book: object, badge?: string, meta?: React.ReactNode}[],
 *   actions?: React.ReactNode}} props
 *   items: sin definir mientras cargan (se ve un esqueleto).
 */
export function BookShelf({ id, title, subtitle, tone = 'white', items, actions }) {
  const titleId = useId();
  const trackId = useId();
  const trackRef = useRef(null);
  const [view, setView] = useState({ page: 0, pages: 1, atStart: true, atEnd: false });

  // Calcula la página visible y cuántas hay a partir del scroll; también al cambiar el tamaño.
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    // Con el hueco del final, el ancho total es un múltiplo exacto de una página más su hueco.
    const step = clientWidth + GAP_PX;
    const next = {
      page: Math.round(scrollLeft / step),
      pages: Math.max(1, Math.ceil((scrollWidth + GAP_PX - 4) / step)),
      atStart: scrollLeft <= 4,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 4,
    };
    setView((prev) =>
      prev.page === next.page &&
      prev.pages === next.pages &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd
        ? prev
        : next,
    );
  }, []);

  const setTrack = useCallback(
    (node) => {
      trackRef.current = node;
      if (!node || typeof ResizeObserver === 'undefined') return undefined;
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [measure],
  );

  const scrollTo = (left) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    trackRef.current?.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
  };
  const pageLeft = (page) => page * ((trackRef.current?.clientWidth ?? 0) + GAP_PX);
  const scrollByPage = (direction) => scrollTo(pageLeft(view.page + direction));

  if (items?.length === 0) return null;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`mx-[calc(50%-50vw)] scroll-mt-4 py-10 sm:py-12 ${tone === 'muted' ? 'bg-stone-100' : 'bg-white'}`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id={titleId}
            className="font-sans text-xl font-bold tracking-wide text-stone-900 uppercase sm:text-2xl"
          >
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
        </div>

        <div className="relative mt-6">
          {items ? (
            <>
              <ArrowButton
                direction="prev"
                controls={trackId}
                disabled={view.atStart}
                onClick={() => scrollByPage(-1)}
              />
              <ul
                id={trackId}
                ref={setTrack}
                onScroll={measure}
                className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {items.map(({ book, badge, meta }) => (
                  <li
                    key={book.id}
                    // En móvil, 40 % del ancho: asoma la tercera tarjeta y se ve que hay más.
                    className="w-[40%] shrink-0 snap-start sm:w-44 lg:w-[calc((100%-7.5rem)/6)]"
                  >
                    <ShelfCard book={book} badge={badge} meta={meta} />
                  </li>
                ))}
              </ul>
              <ArrowButton
                direction="next"
                controls={trackId}
                disabled={view.atEnd}
                onClick={() => scrollByPage(1)}
              />
            </>
          ) : (
            <ShelfSkeleton />
          )}
        </div>

        {view.pages > 1 && (
          <div className="mt-6 flex justify-center gap-1">
            {Array.from({ length: view.pages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-controls={trackId}
                aria-current={i === view.page ? 'true' : undefined}
                onClick={() => scrollTo(pageLeft(i))}
                className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary-700"
              >
                <span
                  className={`block rounded-full transition-all ${
                    i === view.page ? 'h-2 w-5 bg-primary-600' : 'size-2 bg-stone-300'
                  }`}
                />
                <span className="sr-only">Página {i + 1}</span>
              </button>
            ))}
          </div>
        )}

        {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}

/** Botón centrado de "ver más" al pie de una sección (enlace con aspecto de botón). */
export function ShelfAction({ to, children }) {
  return (
    <Link
      to={to}
      className="rounded-md bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
    >
      {children}
    </Link>
  );
}
