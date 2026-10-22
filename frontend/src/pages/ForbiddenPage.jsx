// Se muestra cuando hay sesión pero el rol no permite ver la página.
import { useEffect } from 'react';
import { Link } from 'react-router';

export function ForbiddenPage() {
  useEffect(() => {
    document.title = 'Acceso denegado · Bookia';
  }, []);
  return (
    <section className="mx-auto max-w-md space-y-4 py-12 text-center">
      <p className="text-5xl font-bold text-teal-700">403</p>
      <h1 className="text-2xl font-bold text-stone-900">Acceso denegado</h1>
      <p className="text-stone-700">No tienes permiso para ver esta página.</p>
      <Link
        to="/"
        className="inline-block rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        Volver al catálogo
      </Link>
    </section>
  );
}
