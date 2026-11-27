// Pie de todas las páginas: enlaces para explorar el catálogo, a la cuenta (según la sesión) y a
// "Cómo funciona" de la portada.
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { BookIcon } from './BookIcon.jsx';

const LINK =
  'rounded-sm text-sm text-primary-100 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function Column({ title, links }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-bold tracking-wider text-amber-300 uppercase">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className={LINK}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const { user } = useAuth();

  const explore = [
    { to: '/', label: 'Catálogo' },
    { to: '/?genre=comic-y-novela-grafica', label: 'Cómic y novela gráfica' },
    { to: '/?genre=manga', label: 'Manga' },
    { to: '/?genre=novela', label: 'Novela' },
  ];
  let account;
  let accountTitle = 'Mi cuenta';
  if (!user) {
    accountTitle = 'Cuenta';
    account = [
      { to: '/login', label: 'Iniciar sesión' },
      { to: '/register', label: 'Crear cuenta' },
    ];
  } else if (user.role === 'admin') {
    // El administrador no reserva ni guarda favoritos: gestiona el catálogo y las reservas.
    accountTitle = 'Administración';
    account = [
      { to: '/me/account', label: 'Mi cuenta' },
      { to: '/admin/books', label: 'Libros' },
      { to: '/admin/reservations', label: 'Reservas' },
    ];
  } else {
    account = [
      { to: '/me/account', label: 'Mi cuenta' },
      { to: '/me/reservations', label: 'Mis reservas' },
      { to: '/me/favorites', label: 'Mis favoritos' },
    ];
  }
  const help = [
    { to: '/#como-funciona', label: 'Cómo reservar' },
    { to: '/privacidad', label: 'Política de privacidad' },
  ];

  return (
    <footer className="bg-primary-900 text-primary-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md font-serif text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <BookIcon className="size-6" />
            Bookia
          </Link>
          <p className="max-w-xs text-sm text-primary-100">
            Encuentra tu próxima lectura, mira en qué librería está y resérvala para recogerla.
          </p>
        </div>
        <Column title="Explorar" links={explore} />
        <Column title={accountTitle} links={account} />
        <Column title="Ayuda" links={help} />
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-primary-200">
        Bookia · catálogo de libros y puntos de venta
      </p>
    </footer>
  );
}
