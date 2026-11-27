// Estructura común de todas las páginas: cabecera (menú, logotipo, búsqueda y usuario) y
// contenido principal.
import { Link, Outlet } from 'react-router';
import { BookIcon } from './BookIcon.jsx';
import { FlashNotice } from './FlashNotice.jsx';
import { NavBar } from './NavBar.jsx';
import { NavSearch } from './NavSearch.jsx';
import { SiteFooter } from './SiteFooter.jsx';
import { UserMenu } from './UserMenu.jsx';

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
      {/* sticky: la cabecera, con la búsqueda, se queda arriba al hacer scroll. También sirve de
          referencia (como `relative`) para la búsqueda abierta en móvil, que se superpone a toda
          la barra (NavSearch). z-40: por encima del contenido, por debajo de los <dialog>. */}
      <header className="sticky top-0 z-40 bg-primary-700 text-white shadow-md">
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
          {/* En escritorio la búsqueda ocupa el centro (flex-1); en móvil es una lupa a la derecha. */}
          <div className="flex flex-1 items-center justify-end gap-1">
            <NavSearch />
            <UserMenu />
          </div>
        </div>
      </header>
      <FlashNotice />
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12"
      >
        {children ?? <Outlet />}
      </main>
      <SiteFooter />
    </div>
  );
}
