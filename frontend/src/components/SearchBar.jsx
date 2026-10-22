// Búsqueda por título o autor con espera de 300 ms antes de actualizar la URL.
import { useEffect, useId, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchBar({ value, onChange, label = 'Buscar por título o autor' }) {
  const id = useId();
  const [text, setText] = useState(value);
  const [external, setExternal] = useState(value);

  // Si la URL cambia desde fuera (Atrás, "Limpiar filtros"), el campo la sigue.
  if (value !== external) {
    setExternal(value);
    setText(value);
  }

  useEffect(() => {
    if (text === value) return undefined;
    const timer = setTimeout(() => onChange(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="flex-1 space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        placeholder="Por ejemplo: cien años"
        className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
      />
    </div>
  );
}
