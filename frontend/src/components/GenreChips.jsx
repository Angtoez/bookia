// Géneros como chips sobre el listado del catálogo, para filtrar sin abrir el menú lateral.
// Son enlaces que conservan la búsqueda; el género activo se marca con aria-current y con un
// estilo relleno. En móvil la fila se desliza en horizontal.
import { Link, useSearchParams } from 'react-router';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { listGenres } from '../services/configService.js';
import { applyParamChanges } from '../utils/searchParams.js';

const CHIP =
  'inline-block rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700';

export function GenreChips() {
  const [searchParams] = useSearchParams();
  const { data: genres } = useApiQuery(listGenres);
  const current = searchParams.get('genre') ?? '';

  // Es una ayuda: si los géneros no cargan, siguen en el menú lateral.
  if (!genres?.length) return null;

  const href = (slug) => {
    const search = applyParamChanges(searchParams, { genre: slug }).toString();
    return search ? `/?${search}` : '/';
  };

  return (
    <nav aria-label="Filtrar por género">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
        {[{ slug: '', name: 'Todos' }, ...genres].map((genre) => {
          const active = current === genre.slug;
          return (
            <li key={genre.slug || 'todos'}>
              <Link
                to={href(genre.slug)}
                aria-current={active ? 'page' : undefined}
                className={`${CHIP} ${
                  active
                    ? 'bg-primary-700 text-white ring-primary-700'
                    : 'bg-white text-stone-700 ring-stone-300 hover:bg-primary-50 hover:text-primary-800 hover:ring-primary-300'
                }`}
              >
                {genre.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
