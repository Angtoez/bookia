// Tiendas donde está un libro, con su precio y unidades disponibles (historia 1, escenario 4).
import { formatPrice } from '../utils/formatPrice.js';

function Availability({ store }) {
  if (store.is_sold_out) {
    return (
      <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
        Agotado
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      {store.available === 1 ? 'Queda 1' : `Quedan ${store.available}`}
    </span>
  );
}

/**
 * @param {{stores: Array<object>, currency?: string, renderActions?: (store: object) => React.ReactNode}} props
 *   renderActions: acciones por tienda (p. ej. el botón Reservar de la historia 5).
 */
export function StoreAvailabilityList({ stores, currency, renderActions }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {stores.map((store) => (
        <li
          key={store.store_id}
          className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-900">{store.name}</h3>
            <Availability store={store} />
          </div>
          <dl className="space-y-1 text-sm text-stone-700">
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
                    className="text-teal-800 underline underline-offset-2 hover:text-teal-900"
                  >
                    {store.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-auto pt-1 text-base font-semibold text-stone-900">
            <span className="sr-only">Precio en esta tienda: </span>
            {formatPrice(store.price_cents, currency)}
          </p>
          {renderActions?.(store)}
        </li>
      ))}
    </ul>
  );
}
