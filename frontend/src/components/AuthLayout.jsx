// Marco de las pantallas de acceso: panel de marca con un abanico de portadas y, al lado, la
// tarjeta del formulario. En móvil el panel queda como una franja sobre la tarjeta.
import { BookCover } from './BookCover.jsx';

const FAN = ['-rotate-6 translate-y-2', 'z-10 -mx-4 scale-110 lg:-mx-6', 'rotate-6 translate-y-2'];

/**
 * @param {{title: string, subtitle: string, panelTitle: string, panelText: string,
 *   covers: string[], children: React.ReactNode}} props `covers`: tres ISBN del catálogo.
 */
export function AuthLayout({ title, subtitle, panelTitle, panelText, covers, children }) {
  return (
    <section className="mx-auto max-w-5xl py-4 lg:py-10">
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-stone-200 lg:grid lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col items-center justify-center gap-8 bg-linear-to-br from-primary-950 via-primary-900 to-primary-700 px-6 pt-6 pb-10 text-white lg:px-10 lg:py-14">
          <div className="flex items-end justify-center">
            {covers.map((isbn, i) => (
              <div
                key={isbn}
                className={`w-14 shadow-2xl shadow-black/50 sm:w-16 lg:w-28 ${FAN[i]}`}
              >
                <BookCover book={{ isbn }} size="fill" />
              </div>
            ))}
          </div>
          <div className="hidden max-w-xs text-center lg:block">
            <p className="font-serif text-3xl leading-tight font-semibold">{panelTitle}</p>
            <p className="mt-3 text-primary-100">{panelText}</p>
          </div>
        </div>
        <div className="relative -mt-4 rounded-t-2xl bg-white px-6 py-8 sm:px-10 lg:mt-0 lg:rounded-none lg:py-14">
          <div className="mx-auto max-w-sm">
            <h1 className="font-serif text-3xl font-semibold text-stone-900">{title}</h1>
            <p className="mt-2 text-stone-600">{subtitle}</p>
            <div className="mt-6 space-y-6">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
