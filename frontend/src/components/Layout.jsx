// Estructura común de todas las páginas: cabecera con navegación y contenido principal.
import { Link, Outlet } from 'react-router';
import { NavBar } from './NavBar.jsx';

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only rounded-md bg-white px-3 py-2 text-teal-900 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      <header className="bg-teal-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link
            to="/"
            className="rounded-md text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Bookia
          </Link>
          <NavBar />
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children ?? <Outlet />}
      </main>
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        Bookia · catálogo de libros y puntos de venta
      </footer>
    </div>
  );
}
