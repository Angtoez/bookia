// Filtro por género (slug) con la opción "Todos".
import { useId } from 'react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { listGenres } from '../services/configService.js';

export function GenreFilter({ value, onChange }) {
  const id = useId();
  const { data: genres, error } = useApiQuery(listGenres);

  return (
    <div className="space-y-1 sm:w-56">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        Género
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={Boolean(error)}
        className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
      >
        <option value="">Todos</option>
        {(genres ?? []).map((genre) => (
          <option key={genre.id} value={genre.slug}>
            {genre.name}
          </option>
        ))}
        {/* Un slug de la URL que aún no ha cargado (o ya no existe) sigue seleccionable. */}
        {value && !genres?.some((g) => g.slug === value) && <option value={value}>{value}</option>}
      </select>
      {error && <p className="text-xs text-red-700">No se pudieron cargar los géneros</p>}
    </div>
  );
}
