// Búsqueda de la cabecera: una lupa que despliega el campo. En el catálogo filtra mientras se
// escribe (con la misma espera que SearchBar); en otra página, Enter lleva al catálogo con `q`.
import { useEffect, useId, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { applyParamChanges } from '../utils/searchParams.js';
import { SEARCH_DEBOUNCE_MS } from './SearchBar.jsx';

function SearchIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function NavSearch() {
  const id = useId();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const onCatalog = pathname === '/';
  const urlQ = onCatalog ? (searchParams.get('q') ?? '') : '';
  const [text, setText] = useState(urlQ);
  const [external, setExternal] = useState(urlQ);
  const [open, setOpen] = useState(Boolean(urlQ));
  const [refocus, setRefocus] = useState(false);

  // Si la URL cambia desde fuera (Atrás, "Limpiar filtros", otra página), el campo la sigue.
  if (urlQ !== external) {
    setExternal(urlQ);
    setText(urlQ);
    if (urlQ) setOpen(true);
  }

  useEffect(() => {
    if (!onCatalog || text === urlQ) return undefined;
    const timer = setTimeout(
      () => setSearchParams((prev) => applyParamChanges(prev, { q: text })),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [onCatalog, text, urlQ, setSearchParams]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onCatalog) {
      setSearchParams((prev) => applyParamChanges(prev, { q: text }));
      return;
    }
    const q = text.trim();
    navigate(q ? `/?${new URLSearchParams({ q })}` : '/');
  };

  // Se pliega al salir del campo vacío, salvo si el foco pasa a su propio botón.
  const handleBlur = (event) => {
    if (!text && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <form role="search" onSubmit={handleSubmit} onBlur={handleBlur} className="flex items-center">
      {open ? (
        <div className="relative">
          <label htmlFor={id} className="sr-only">
            Buscar por título o autor
          </label>
          <input
            id={id}
            type="search"
            // Se monta al pulsar la lupa: el foco pasa directamente al campo.
            autoFocus
            value={text}
            maxLength={100}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                close();
                setRefocus(true);
              }
            }}
            placeholder="Título o autor"
            className="w-28 rounded-full bg-white py-1.5 pr-3 pl-9 text-sm text-stone-900 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-56"
          />
          <button
            type="submit"
            className="absolute inset-y-0 left-0 flex items-center rounded-l-full pr-1 pl-2.5 text-stone-500 hover:text-primary-700"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only">Buscar</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          // Tras cerrar con Esc, el foco vuelve a la lupa en vez de perderse.
          autoFocus={refocus}
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-primary-50 hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <SearchIcon className="size-6" />
          <span className="sr-only">Buscar libros</span>
        </button>
      )}
    </form>
  );
}
