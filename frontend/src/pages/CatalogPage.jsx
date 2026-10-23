// Catálogo público: búsqueda, filtro por género y paginación sincronizados con la URL (US1).
import { useCallback, useEffect } from 'react';
import { BookCard } from '../components/BookCard.jsx';
import { BookGridSkeleton } from '../components/BookSkeletons.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { GenreFilter } from '../components/GenreFilter.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { useBooks } from '../hooks/useBooks.js';
import { useConfig } from '../hooks/useConfig.js';

function resultsLabel(total) {
  if (total === 1) return '1 libro';
  return `${total} libros`;
}

export function CatalogPage() {
  const { params, data, error, loading, reload, setParams, clearFilters } = useBooks();
  const config = useConfig();
  const hasFilters = Boolean(params.q || params.genre);

  useEffect(() => {
    document.title = 'Catálogo · Bookia';
  }, []);

  const handleSearch = useCallback((q) => setParams({ q }), [setParams]);
  const handleGenre = useCallback((genre) => setParams({ genre }), [setParams]);
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
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
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

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Catálogo</h1>
      <search className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchBar value={params.q} onChange={handleSearch} />
        <GenreFilter value={params.genre} onChange={handleGenre} />
      </search>
      <p aria-live="polite" className="text-sm text-stone-600">
        {data && !error && !loading ? resultsLabel(data.total) : ''}
      </p>
      {content}
    </section>
  );
}
