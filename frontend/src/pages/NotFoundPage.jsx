// Página para rutas o recursos que no existen.
import { useEffect } from 'react';
import { Link } from 'react-router';

export function NotFoundPage({ message = 'La página que buscas no existe o se ha eliminado.' }) {
  useEffect(() => {
    document.title = 'No encontrado · Bookia';
  }, []);
  return (
    <section className="mx-auto max-w-md space-y-4 py-12 text-center">
      <p className="text-5xl font-bold text-teal-700">404</p>
      <h1 className="text-2xl font-bold text-stone-900">No encontrado</h1>
      <p className="text-stone-700">{message}</p>
      <Link
        to="/"
        className="inline-block rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        Volver al catálogo
      </Link>
    </section>
  );
}
