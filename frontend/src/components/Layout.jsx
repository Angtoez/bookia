// Estructura común de todas las páginas: cabecera (menú, logotipo, búsqueda y usuario) y
// contenido principal.
import { Link, Outlet } from 'react-router';
import { BookIcon } from './BookIcon.jsx';
import { NavBar, NavUser } from './NavBar.jsx';
import { NavSearch } from './NavSearch.jsx';

export function Layout({ children }) {
  return (
    // overflow-x-clip: las secciones a todo lo ancho de la portada usan 100vw, que incluye la
    // barra de scroll; sin esto aparecería un scroll horizontal de unos píxeles.
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <a
        href="#contenido"
        className="sr-only rounded-md bg-white px-3 py-2 text-primary-900 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Saltar al contenido
      </a>
      {/* relative: en móvil, la búsqueda abierta se superpone a toda la barra (NavSearch). */}
      <header className="relative bg-primary-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3 sm:gap-2">
          <NavBar />
          {/* Hueco del logotipo de Bookia, cuando exista. */}
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-serif text-2xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <BookIcon className="size-7" />
            Bookia
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NavSearch />
            <NavUser />
          </div>
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
