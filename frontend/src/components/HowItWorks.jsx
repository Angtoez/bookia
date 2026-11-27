// "Cómo funciona" de la portada: busca, reserva y recoge, con los plazos de GET /api/config. El
// enlace "Cómo reservar" del pie lleva aquí (/#como-funciona) desde cualquier página.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useConfig } from '../hooks/useConfig.js';

const ICONS = {
  search: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM16 16l4.5 4.5',
  bookmark: 'M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5V20h16V9.5M9.5 20v-5h5v5',
};

const days = (n) => (n === 1 ? '1 día' : `${n} días`);

function Step({ number, icon, title, children }) {
  return (
    <li className="flex gap-4 rounded-xl bg-white p-5 shadow-xs ring-1 ring-stone-200 sm:flex-col sm:items-center sm:text-center">
      <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICONS[icon]} />
        </svg>
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-amber-400 text-xs font-bold text-stone-900"
        >
          {number}
        </span>
      </span>
      <div>
        <h3 className="font-bold text-stone-900">
          <span className="sr-only">Paso {number}: </span>
          {title}
        </h3>
        <p className="mt-1 text-sm text-stone-600">{children}</p>
      </div>
    </li>
  );
}

export function HowItWorks() {
  const config = useConfig();
  const ref = useRef(null);
  const { hash } = useLocation();

  // React Router no baja hasta el ancla al llegar desde otra página: se hace aquí.
  useEffect(() => {
    if (hash === '#como-funciona') ref.current?.scrollIntoView?.();
  }, [hash]);

  const pending = config?.pending_ttl_days;
  const pickup = config?.pickup_ttl_days;

  return (
    <section
      ref={ref}
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="scroll-mt-20 py-10 sm:py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="como-funciona-titulo"
          className="font-sans text-xl font-bold tracking-wide text-stone-900 uppercase sm:text-2xl"
        >
          Cómo funciona
        </h2>
        <p className="mt-2 text-stone-600">Reserva en línea y recoge tu libro en la librería.</p>
      </div>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        <Step number={1} icon="search" title="Busca">
          Escribe el título o el autor y mira en qué librerías está disponible y a qué precio.
        </Step>
        <Step number={2} icon="bookmark" title="Resérvalo">
          Elige una librería con existencias.
          {pending ? ` La librería tiene hasta ${days(pending)} para preparártelo.` : ''}
        </Step>
        <Step number={3} icon="store" title="Recógelo">
          En «Mis reservas» verás cuándo está listo
          {pickup ? `; desde entonces tienes ${days(pickup)} para pasar a recogerlo.` : '.'}
        </Step>
      </ol>
    </section>
  );
}
