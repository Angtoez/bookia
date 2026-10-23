// Placeholders de carga con la forma de las tarjetas y del detalle, para que la página no salte al
// llegar los datos. Los lectores de pantalla solo oyen el texto de carga.

const BLOCK = 'rounded bg-stone-200 motion-safe:animate-pulse';

function BookCardSkeleton() {
  return (
    <div className="flex h-full gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className={`aspect-[2/3] w-20 shrink-0 ${BLOCK}`} />
      <div className="flex flex-1 flex-col gap-2 pt-2">
        <div className={`h-3 w-16 ${BLOCK}`} />
        <div className={`h-5 w-4/5 ${BLOCK}`} />
        <div className={`h-4 w-1/2 ${BLOCK}`} />
        <div className={`mt-auto h-5 w-20 ${BLOCK}`} />
      </div>
    </div>
  );
}

/** Rejilla de tarjetas vacías con las mismas columnas que la del catálogo. */
export function BookGridSkeleton({ label, count = 6 }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <ul aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <BookCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Forma del detalle de un libro: cabecera con portada, datos y tiendas. */
export function BookDetailSkeleton({ label }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-8">
        <div className={`h-4 w-36 ${BLOCK}`} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className={`aspect-[2/3] w-32 shrink-0 sm:w-44 ${BLOCK}`} />
          <div className="flex-1 space-y-3">
            <div className={`h-4 w-24 ${BLOCK}`} />
            <div className={`h-8 w-3/4 ${BLOCK}`} />
            <div className={`h-5 w-1/3 ${BLOCK}`} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-3 w-16 ${BLOCK}`} />
              <div className={`h-5 w-28 ${BLOCK}`} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className={`h-6 w-48 ${BLOCK}`} />
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={`h-20 rounded-xl ${BLOCK}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
