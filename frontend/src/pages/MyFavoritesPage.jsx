// "Mis favoritos": libros guardados con su disponibilidad actual (US6, FR-022i).
import { useEffect } from 'react';
import { Link } from 'react-router';
import { BookCard } from '../components/BookCard.jsx';
import { BookGridSkeleton } from '../components/BookSkeletons.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useConfig } from '../hooks/useConfig.js';
import { listFavorites } from '../services/favoritesService.js';
import { plural } from '../utils/plural.js';

function Availability({ count }) {
  if (count > 0) {
    return (
      <p className="mt-2 text-sm font-medium text-emerald-800">
        Disponible en {plural(count, 'establecimiento')}
      </p>
    );
  }
  return <p className="mt-2 text-sm font-medium text-stone-600">Sin existencias</p>;
}

export function MyFavoritesPage() {
  const { page, data, error, loading, reload, setPage } = useAdminList(listFavorites);
  const config = useConfig();

  useEffect(() => {
    document.title = 'Mis favoritos · Bookia';
  }, []);

  // Al quitar un favorito, la lista se recarga y desaparece; si era el último de la página,
  // vuelve a la anterior.
  const handleChange = (isFavorite) => {
    if (isFavorite) return;
    if (data.items.length === 1 && page > 1) setPage(page - 1);
    else reload();
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <BookGridSkeleton label="Cargando tus favoritos…" />;
  else if (data.items.length === 0) {
    content = (
      <div className="space-y-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        <p>Todavía no has guardado ningún libro. Pulsa el corazón de un libro para añadirlo.</p>
        <Link
          to="/"
          className="inline-block font-medium text-teal-800 underline underline-offset-2"
        >
          Ir al catálogo
        </Link>
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
              <BookCard book={book} currency={config?.currency} onFavoriteChange={handleChange}>
                <Availability count={book.stores_available} />
              </BookCard>
            </li>
          ))}
        </ul>
        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Mis favoritos</h1>
      {content}
    </section>
  );
}
