// Caja "Dónde encontrarlo" del detalle de un libro: resumen (precio más bajo y en cuántas
// librerías hay unidades) y, por tienda, disponibilidad, precio y la acción de reservar
// (US1, escenarios 4 y 5; US5). La dirección, el horario y el teléfono van plegados.
import { formatPrice } from '../utils/formatPrice.js';

function Availability({ store }) {
  const soldOut = store.is_sold_out;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${soldOut ? 'text-stone-500' : 'text-emerald-800'}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${soldOut ? 'bg-stone-400' : 'bg-emerald-500'}`}
      />
      {soldOut ? 'Agotado' : store.available === 1 ? 'Queda 1' : `Quedan ${store.available}`}
    </span>
  );
}

function Summary({ stores, currency }) {
  const inStock = stores.filter((store) => !store.is_sold_out);
  if (stores.length === 0) {
    return (
      <p className="text-stone-700">Este libro no está disponible en ningún establecimiento.</p>
    );
  }
  if (inStock.length === 0) {
    return <p className="text-stone-700">Agotado en todas las librerías por ahora.</p>;
  }
  const lowest = Math.min(...inStock.map((store) => store.price_cents));
  return (
    <div>
      <p className="text-2xl font-bold text-stone-900">
        <span className="text-base font-medium text-stone-600">Desde </span>
        {formatPrice(lowest, currency)}
      </p>
      <p className="text-sm text-stone-600">
        Disponible en {inStock.length === 1 ? '1 librería' : `${inStock.length} librerías`}
      </p>
    </div>
  );
}

/**
 * @param {{stores: Array<object>, currency?: string, notice?: React.ReactNode,
 *   renderActions?: (store: object) => React.ReactNode}} props
 *   notice: aviso tras reservar. renderActions: acciones por tienda (el botón Reservar).
 */
export function BookAvailabilityBox({ stores, currency, notice, renderActions }) {
  return (
    <section
      aria-labelledby="donde-encontrarlo"
      className="rounded-xl border border-stone-200 bg-white shadow-sm"
    >
      <div className="space-y-3 border-b border-stone-200 p-5">
        <h2
          id="donde-encontrarlo"
          className="font-sans text-xs font-bold tracking-wider text-primary-700 uppercase"
        >
          Dónde encontrarlo
        </h2>
        <Summary stores={stores} currency={currency} />
        {notice}
      </div>
      {stores.length > 0 && (
        <ul className="divide-y divide-stone-200">
          {stores.map((store) => (
            <li key={store.store_id} className="space-y-2 p-5">
              <h3 className="font-semibold text-stone-900">{store.name}</h3>
              <div className="flex items-center justify-between gap-2">
                <Availability store={store} />
                <p className="font-semibold text-stone-900">
                  <span className="sr-only">Precio en esta tienda: </span>
                  {formatPrice(store.price_cents, currency)}
                </p>
              </div>
              {renderActions?.(store)}
              <details className="group text-sm text-stone-700">
                <summary className="cursor-pointer list-none rounded-sm font-medium text-primary-700 select-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="mr-1 inline-block transition-transform group-open:rotate-90"
                  >
                    ▸
                  </span>
                  Dirección y horario
                </summary>
                <dl className="mt-2 space-y-1 pl-4">
                  <div>
                    <dt className="sr-only">Dirección</dt>
                    <dd>{store.address}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Horario</dt>
                    <dd>{store.opening_hours}</dd>
                  </div>
                  {store.phone && (
                    <div>
                      <dt className="sr-only">Teléfono</dt>
                      <dd>
                        <a
                          href={`tel:${store.phone.replace(/\s+/g, '')}`}
                          className="text-primary-800 underline underline-offset-2 hover:text-primary-900"
                        >
                          {store.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
