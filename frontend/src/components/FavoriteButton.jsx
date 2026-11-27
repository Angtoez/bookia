// Corazón para marcar un libro como favorito. Un visitante va al login y vuelve aquí; al
// administrador no se le muestra, porque no guarda favoritos.
import { Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { useFavoriteToggle } from '../hooks/useFavorites.js';
import { loginPathFor } from '../utils/safeNext.js';

const BASE =
  'relative z-10 inline-flex size-10 items-center justify-center rounded-full border bg-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700';

function HeartIcon({ filled }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`size-5 ${filled ? 'fill-rose-600 stroke-rose-600' : 'fill-none stroke-stone-600'}`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.7 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.5 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </svg>
  );
}

// Con texto (en el detalle): un botón ancho en lugar del corazón redondo.
const LABELED =
  'relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700';

/**
 * @param {{book: {id: string, title: string, is_favorite?: boolean},
 *   onChange?: (isFavorite: boolean) => void, withLabel?: boolean}} props
 *   withLabel: muestra el texto junto al corazón.
 */
export function FavoriteButton({ book, onChange, withLabel = false }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const { isFavorite, pending, error, toggle } = useFavoriteToggle(
    book.id,
    book.is_favorite,
    onChange,
  );

  if (user?.role === 'admin') return null;

  if (status !== 'authenticated') {
    return (
      <Link
        to={loginPathFor(location)}
        aria-label={`Inicia sesión para guardar «${book.title}» en favoritos`}
        title="Inicia sesión para guardar favoritos"
        className={`${withLabel ? LABELED : BASE} border-stone-300 hover:bg-stone-50`}
      >
        <HeartIcon filled={false} />
        {withLabel && <span aria-hidden="true">Guardar en favoritos</span>}
      </Link>
    );
  }

  const label = isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
  return (
    <span
      className={`relative z-10 inline-flex flex-col gap-1 ${withLabel ? 'w-full items-stretch' : 'items-end'}`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={isFavorite}
        aria-label={label}
        title={label}
        className={`${withLabel ? LABELED : BASE} ${isFavorite ? 'border-rose-300 hover:bg-rose-50' : 'border-stone-300 hover:bg-stone-50'} disabled:opacity-70`}
      >
        <HeartIcon filled={isFavorite} />
        {withLabel && (
          <span aria-hidden="true">{isFavorite ? 'En tus favoritos' : 'Guardar en favoritos'}</span>
        )}
      </button>
      {error && (
        <span role="alert" className="max-w-48 text-right text-xs text-red-700">
          {error.message}
        </span>
      )}
    </span>
  );
}
