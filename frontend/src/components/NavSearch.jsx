// Búsqueda de la cabecera. En escritorio es una barra siempre visible en el centro; en móvil,
// una lupa que despliega el campo sobre la cabecera. Busca mientras se escribe (con la misma
// espera que SearchBar): en el catálogo filtra y desde otra página lleva a él con `q`.
import { useCallback, useEffect, useId, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery.js';
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
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const shown = desktop || open;

  // Si la URL cambia desde fuera (Atrás, "Limpiar filtros", otra página), el campo la sigue.
  if (urlQ !== external) {
    setExternal(urlQ);
    setText(urlQ);
    // Al salir del catálogo con una búsqueda (p. ej. al abrir un libro), el campo se pliega; en
    // el catálogo sigue abierto aunque se borre el texto, porque se está escribiendo en él.
    if (urlQ) setOpen(true);
    else if (!onCatalog) setOpen(false);
  }

  // En el catálogo cambia `q` conservando el resto de filtros; desde otra página lleva al
  // catálogo con la búsqueda. El campo sigue montado (está en la cabecera) y con el foco.
  const search = useCallback(
    (value) => {
      if (onCatalog) {
        setSearchParams((prev) => applyParamChanges(prev, { q: value }));
        return;
      }
      const q = value.trim();
      navigate(q ? `/?${new URLSearchParams({ q })}` : '/');
    },
    [onCatalog, setSearchParams, navigate],
  );

  // Busca al dejar de escribir, en cualquier página. Fuera del catálogo solo si hay texto: abrir
  // la lupa en una ficha no debe sacarte de ella.
  useEffect(() => {
    const pending = onCatalog ? text !== urlQ : Boolean(text.trim());
    if (!pending) return undefined;
    const timer = setTimeout(() => search(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [onCatalog, text, urlQ, search]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    search(text);
  };

  // Se pliega al salir del campo vacío, salvo si el foco pasa a su propio botón.
  const handleBlur = (event) => {
    if (!text && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  const closeAndRefocus = () => {
    close();
    setRefocus(true);
  };

  // En escritorio Esc solo borra el texto: la barra no se pliega y el foco sigue en ella.
  const handleKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    if (desktop) setText('');
    else closeAndRefocus();
  };

  // En móvil, abierto ocupa toda la barra de la cabecera (que es `relative`) y lleva su propio
  // botón de cerrar. En escritorio ocupa el centro de la cabecera.
  const overlay = desktop
    ? 'flex-1 justify-center px-4'
    : open
      ? 'absolute inset-0 z-20 gap-2 bg-primary-700 px-4'
      : '';

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      className={`flex items-center ${overlay}`}
    >
      {shown ? (
        <div className="relative w-full flex-1 sm:max-w-xl">
          <label htmlFor={id} className="sr-only">
            Buscar por título o autor
          </label>
          <input
            id={id}
            type="search"
            // En móvil se monta al pulsar la lupa: el foco pasa directamente al campo. En
            // escritorio está siempre y no debe robar el foco al cargar la página.
            autoFocus={!desktop}
            value={text}
            maxLength={100}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca por título o autor"
            className="w-full rounded-full bg-white py-2 pr-4 pl-10 text-sm text-stone-900 shadow-sm placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <button
            type="submit"
            className="absolute inset-y-0 left-0 flex items-center rounded-l-full pr-1 pl-3 text-stone-500 hover:text-primary-700"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only">Buscar</span>
          </button>
        </div>
      ) : null}
      {/* Claves distintas: si React reutilizara el mismo <button>, el autoFocus de la lupa no
          se aplicaría al cerrar. En escritorio no hay lupa ni botón de cerrar. */}
      {desktop ? null : open ? (
        <button
          key="cerrar"
          type="button"
          onClick={closeAndRefocus}
          className="rounded-md p-2 text-primary-50 hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-6 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          <span className="sr-only">Cerrar la búsqueda</span>
        </button>
      ) : (
        <button
          key="lupa"
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
