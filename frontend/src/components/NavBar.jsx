// Navegación principal en un panel lateral que se abre desde la izquierda con el botón de menú:
// enlaces según la sesión y el rol, géneros del catálogo y cierre de sesión. En la cabecera quedan la
// búsqueda (NavSearch) y el menú de usuario (UserMenu). El panel es un <dialog> modal, como ConfirmDialog:
// el navegador gestiona el foco y la tecla Escape.
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../hooks/useAuth.js';
import { listGenres } from '../services/configService.js';
import { applyParamChanges } from '../utils/searchParams.js';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2';

const itemClass = (active) =>
  `block rounded-md px-3 py-2 text-sm font-semibold ${FOCUS} focus-visible:outline-primary-700 ${
    active ? 'bg-primary-50 text-primary-800' : 'text-stone-800 hover:bg-stone-100'
  }`;

const linkClass = ({ isActive }) => itemClass(isActive);

function Icon({ path, className = 'size-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const MENU = 'M4 7h16M4 12h16M4 17h16';
const CLOSE = 'M6 6l12 12M18 6L6 18';

function Section({ title, children }) {
  return (
    <div className="space-y-1">
      {/* Encabezados en el color de la marca, pequeños y espaciados: distinguen las secciones sin
          competir con los enlaces, que van en negrita. */}
      <h3 className="px-3 pt-4 pb-1 text-xs font-bold tracking-wider text-primary-700 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Géneros como enlaces al catálogo; dentro del catálogo conservan la búsqueda. */
function GenreLinks() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { data: genres, error } = useApiQuery(listGenres);
  const onCatalog = pathname === '/';
  const current = onCatalog ? (searchParams.get('genre') ?? '') : '';
  const base = onCatalog ? searchParams : new URLSearchParams();
  const href = (slug) => {
    const search = applyParamChanges(base, { genre: slug }).toString();
    return search ? `/?${search}` : '/';
  };

  if (error) return <p className="px-3 text-sm text-red-700">No se pudieron cargar los géneros</p>;
  return (
    <ul className="space-y-0.5">
      {[{ slug: '', name: 'Todos' }, ...(genres ?? [])].map((genre) => {
        const active = onCatalog && current === genre.slug;
        return (
          <li key={genre.slug || 'todos'}>
            <Link
              to={href(genre.slug)}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {genre.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NavBar() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom no implementa showModal: en las pruebas basta con el atributo open.
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  const close = () => setOpen(false);

  const handleCancel = (event) => {
    // Escape: el estado lo lleva React, no el navegador.
    event.preventDefault();
    close();
  };

  // Se cierra al elegir un enlace y al pulsar fuera del panel (el clic cae en el propio <dialog>).
  const handleClick = (event) => {
    if (event.target === event.currentTarget || event.target.closest('a')) close();
  };

  const handleLogout = async () => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
      close();
      navigate('/');
    }
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`rounded-md p-2 text-primary-50 hover:bg-primary-800 ${FOCUS} focus-visible:outline-white`}
      >
        <Icon path={MENU} />
        <span className="sr-only">Abrir menú</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onCancel={handleCancel}
        onClick={handleClick}
        className="fixed inset-y-0 left-0 m-0 h-full max-h-full w-80 max-w-[85vw] bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/50"
      >
        {open && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 id={titleId} className="text-lg font-semibold">
                Menú
              </h2>
              <button
                type="button"
                onClick={close}
                className={`rounded-md p-2 text-stone-600 hover:bg-stone-100 ${FOCUS} focus-visible:outline-primary-700`}
              >
                <Icon path={CLOSE} className="size-5" />
                <span className="sr-only">Cerrar menú</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              <nav aria-label="Principal">
                <Section title="Explorar">
                  <NavLink to="/" end className={linkClass}>
                    Catálogo
                  </NavLink>
                </Section>
                {status === 'anonymous' && (
                  <Section title="Cuenta">
                    <NavLink to="/login" className={linkClass}>
                      Iniciar sesión
                    </NavLink>
                    <NavLink to="/register" className={linkClass}>
                      Crear cuenta
                    </NavLink>
                  </Section>
                )}
                {/* El administrador no reserva ni guarda favoritos: gestiona las reservas desde
                    Administración. */}
                {user && user.role !== 'admin' && (
                  <Section title="Mi cuenta">
                    <NavLink to="/me/reservations" className={linkClass}>
                      Mis reservas
                    </NavLink>
                    <NavLink to="/me/favorites" className={linkClass}>
                      Mis favoritos
                    </NavLink>
                  </Section>
                )}
                {user?.role === 'admin' && (
                  <Section title="Administración">
                    <NavLink to="/admin/books" className={linkClass}>
                      Libros
                    </NavLink>
                    <NavLink to="/admin/stores" className={linkClass}>
                      Establecimientos
                    </NavLink>
                    <NavLink to="/admin/reservations" className={linkClass}>
                      Reservas
                    </NavLink>
                    <NavLink to="/admin/users" className={linkClass}>
                      Usuarios
                    </NavLink>
                    <NavLink to="/admin/audit" className={linkClass}>
                      Auditoría
                    </NavLink>
                  </Section>
                )}
              </nav>
              <nav aria-label="Géneros">
                <Section title="Géneros">
                  <GenreLinks />
                </Section>
              </nav>
            </div>
            {user && (
              <div className="border-t border-stone-200 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={leaving}
                  className={`w-full text-left disabled:opacity-60 ${itemClass(false)}`}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
