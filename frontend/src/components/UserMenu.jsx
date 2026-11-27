// Usuario de la cabecera. Sin sesión, el acceso a "Iniciar sesión". Con sesión, un botón con las
// iniciales y el nombre que despliega sus enlaces, la administración si es admin y el cierre de
// sesión. Es un desplegable sencillo (botón con aria-expanded y lista de enlaces), no un
// role="menu", así que se recorre con Tab; se cierra con Esc, al pulsar fuera o al navegar.
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2';
const ITEM = `block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-100 ${FOCUS} focus-visible:outline-primary-700`;

const USER = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0';

const ADMIN_LINKS = [
  { to: '/admin/books', label: 'Libros' },
  { to: '/admin/stores', label: 'Establecimientos' },
  { to: '/admin/reservations', label: 'Reservas' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/audit', label: 'Auditoría' },
];

/** Iniciales del nombre: la primera letra de las dos primeras palabras. */
export function initials(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={USER} />
    </svg>
  );
}

export function UserMenu() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const [leaving, setLeaving] = useState(false);

  // Al cambiar de página (por un enlace del panel o por Atrás) el panel se cierra.
  if (open && openedAt !== pathname) setOpen(false);

  // Mientras está abierto, un clic fuera lo cierra y Esc lo cierra devolviendo el foco al botón.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (status === 'anonymous') {
    return (
      <Link
        to="/login"
        className={`flex items-center gap-1.5 rounded-md p-2 text-sm font-medium text-primary-50 hover:bg-primary-800 ${FOCUS} focus-visible:outline-white`}
      >
        <UserIcon />
        <span className="sr-only sm:not-sr-only">Iniciar sesión</span>
      </Link>
    );
  }
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const toggle = () => {
    setOpenedAt(pathname);
    setOpen((value) => !value);
  };

  // Si el foco sale del desplegable con Tab, se cierra.
  const handleBlur = (event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  const handleLogout = async () => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
      setOpen(false);
      navigate('/');
    }
  };

  return (
    <div ref={rootRef} className="relative" onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={`flex items-center gap-2 rounded-full p-1 text-sm font-medium text-primary-50 hover:bg-primary-800 sm:pr-3 ${FOCUS} focus-visible:outline-white`}
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-800"
        >
          {initials(user.name) || '?'}
        </span>
        <span className="sr-only max-w-40 truncate sm:not-sr-only">{user.name}</span>
        {isAdmin && (
          <span
            aria-hidden="true"
            className="hidden rounded-full bg-primary-900/40 px-2 py-0.5 text-xs font-semibold tracking-wide text-white uppercase ring-1 ring-white/30 sm:inline"
          >
            Admin
          </span>
        )}
        <span className="sr-only">{isAdmin ? ' (administrador): ' : ': '}menú de la cuenta</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`hidden size-4 fill-none stroke-current transition-transform sm:block ${open ? 'rotate-180' : ''}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        // Elegir un enlace cierra el panel también si lleva a la página en la que ya se está.
        <div
          id={panelId}
          onClick={(event) => {
            if (event.target.closest('a')) setOpen(false);
          }}
          className="absolute top-full right-0 z-30 mt-2 w-64 rounded-lg bg-white p-2 text-stone-900 shadow-lg ring-1 ring-stone-200"
        >
          <div className="border-b border-stone-200 px-3 pt-1 pb-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
            {isAdmin && (
              <p className="mt-1.5 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-800">
                Administrador
              </p>
            )}
          </div>
          {/* Como en el menú lateral: Mi cuenta para todos; el administrador no reserva ni guarda
              favoritos. */}
          <nav aria-label="Mi cuenta" className="py-1">
            <Link to="/me/account" className={ITEM}>
              Mi cuenta
            </Link>
            {!isAdmin && (
              <>
                <Link to="/me/reservations" className={ITEM}>
                  Mis reservas
                </Link>
                <Link to="/me/favorites" className={ITEM}>
                  Mis favoritos
                </Link>
              </>
            )}
          </nav>
          {isAdmin && (
            <nav aria-label="Administración" className="border-t border-stone-200 py-1">
              <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-primary-700 uppercase">
                Administración
              </p>
              {ADMIN_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className={ITEM}>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="border-t border-stone-200 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={leaving}
              className={`${ITEM} disabled:opacity-60`}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
