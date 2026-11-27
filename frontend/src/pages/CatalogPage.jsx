// Catálogo público: búsqueda, filtro por género y paginación sincronizados con la URL (US1). Sin
// filtros y en la primera página es la portada: banner, secciones destacadas y el catálogo.
import { useEffect } from 'react';
import { BookCard } from '../components/BookCard.jsx';
import { BookGridSkeleton } from '../components/BookSkeletons.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { GenreChips } from '../components/GenreChips.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { HomeHero } from '../components/HomeHero.jsx';
import { ComicsMangaShelf, TopRatedShelf } from '../components/HomeShelves.jsx';
import { HowItWorks } from '../components/HowItWorks.jsx';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useBooks } from '../hooks/useBooks.js';
import { useConfig } from '../hooks/useConfig.js';
import { listGenres } from '../services/configService.js';

function resultsLabel(total, q) {
  const count = total === 1 ? '1 libro' : `${total} libros`;
  // La búsqueda ya no está junto al listado: se recuerda aquí qué se ha buscado.
  return q.trim() ? `${count} para «${q.trim()}»` : count;
}

export function CatalogPage() {
  const { params, data, error, loading, reload, setParams, clearFilters } = useBooks();
  const config = useConfig();
  const { data: genres } = useApiQuery(listGenres);
  const hasFilters = Boolean(params.q || params.genre);
  // La portada solo se muestra sin búsqueda, sin género y en la primera página.
  const showFeatured = !hasFilters && params.page === 1;
  // Con un género elegido, su nombre hace de título; si aún no ha cargado, se ve el slug.
  const genreName = params.genre
    ? (genres?.find((g) => g.slug === params.genre)?.name ?? params.genre)
    : null;

  useEffect(() => {
    document.title = `${genreName ?? 'Catálogo'} · Bookia`;
  }, [genreName]);

  const handlePage = (page) => {
    setParams({ page });
    window.scrollTo?.({ top: 0 });
  };

  let content;
  if (error) {
    content = <ErrorMessage error={error} onRetry={reload} />;
  } else if (!data) {
    content = <BookGridSkeleton label="Cargando el catálogo…" />;
  } else if (data.items.length === 0) {
    content = (
      <div className="space-y-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
        <p className="text-lg font-medium text-stone-800">No hay libros que coincidan</p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  } else {
    content = (
      <>
        <ul
          aria-busy={loading}
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
        >
          {data.items.map((book) => (
            <li key={book.id}>
              <BookCard book={book} currency={config?.currency} />
            </li>
          ))}
        </ul>
        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={handlePage} />
      </>
    );
  }

  const summary = (
    <p aria-live="polite" className="text-sm text-stone-600">
      {data && !error && !loading ? resultsLabel(data.total, params.q) : ''}
    </p>
  );

  // Portada, al estilo de las webs editoriales: banner, cómo funciona, secciones con carrusel y,
  // al final, todo el catálogo con los géneros como chips.
  if (showFeatured) {
    return (
      <>
        {/* El título principal (h1) está en el banner. */}
        <HomeHero />
        <HowItWorks />
        <TopRatedShelf />
        <ComicsMangaShelf />
        <section
          id="todos-los-libros"
          aria-labelledby="todos-los-libros-titulo"
          className="scroll-mt-20 space-y-6 pt-10 sm:pt-12"
        >
          <div className="text-center">
            <h2
              id="todos-los-libros-titulo"
              className="font-sans text-xl font-bold tracking-wide text-stone-900 uppercase sm:text-2xl"
            >
              Todos los libros | Explora la colección
            </h2>
            <div className="mt-2 flex justify-center">{summary}</div>
          </div>
          <GenreChips />
          {content}
        </section>
      </>
    );
  }

  return (
    <section className="space-y-6">
      {/* La búsqueda y los géneros están en la cabecera (NavSearch y el menú de NavBar). Sin
          género (p. ej. con una búsqueda), el título solo existe para los lectores de pantalla. */}
      <div className="space-y-1">
        <h1 className={genreName ? 'text-2xl font-bold text-stone-900' : 'sr-only'}>
          {genreName ?? 'Catálogo'}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {summary}
          {params.genre && (
            <button
              type="button"
              onClick={() => setParams({ genre: '' })}
              className="rounded-sm text-sm font-medium text-primary-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
            >
              Ver todos los géneros
            </button>
          )}
        </div>
      </div>
      <GenreChips />
      {content}
    </section>
  );
}
