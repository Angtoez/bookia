// Tarjeta de una sección de Mi cuenta (feature 002), con su título y, opcionalmente, en tono de
// peligro para el borrado de la cuenta.
import { useId } from 'react';

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-md bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:opacity-60';

/** @param {{title: string, description?: React.ReactNode, danger?: boolean, children: React.ReactNode}} props */
export function AccountSection({ title, description, danger = false, children }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`space-y-4 rounded-xl bg-white p-6 shadow-xs ring-1 sm:p-8 ${
        danger ? 'ring-red-300' : 'ring-stone-200'
      }`}
    >
      <div className="space-y-1">
        <h2
          id={titleId}
          className={`text-xl font-bold ${danger ? 'text-red-800' : 'text-stone-900'}`}
        >
          {title}
        </h2>
        {description && <p className="text-sm text-stone-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}
