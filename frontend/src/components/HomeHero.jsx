// Banner principal de la portada, a todo lo ancho: diapositivas con texto, llamada y un abanico
// de portadas. Avanza solo cada 7 s, salvo con el ratón encima, con el foco dentro, en pausa o
// si el sistema pide reducir el movimiento (WCAG 2.2.2); tiene flechas, puntos y pausa.
import { useEffect, useState } from 'react';
import { BookCover } from './BookCover.jsx';

const INTERVAL_MS = 7000;

// Las portadas son de libros del catálogo de demostración (solo se usa el ISBN para la imagen).
const SLIDES = [
  {
    eyebrow: 'Elegidos por los lectores',
    title: 'Los libros mejor valorados',
    text: 'Watchmen, Maus, El principito… las lecturas con mejores reseñas te esperan en las librerías de Huauchinango.',
    cta: { label: 'Ver los mejor valorados', href: '#mejor-valorados' },
    covers: ['9788416998722', '9788439720713', '9788498381498'],
    tone: 'from-primary-950 via-primary-900 to-primary-700',
  },
  {
    eyebrow: 'Nuevo en Bookia',
    title: 'Cómics, manga y novela gráfica',
    text: 'Más de 80 títulos, de Naruto y One Piece a Batman y Astérix. Descubre tu próxima saga.',
    cta: { label: 'Ver cómics y manga', href: '#comics-y-manga' },
    covers: ['9788416401932', '9789877246520', '9788468480114'],
    tone: 'from-stone-950 via-indigo-950 to-indigo-800',
  },
  {
    eyebrow: 'Reserva en línea',
    title: 'Apártalo hoy, recógelo en tu librería',
    text: 'Busca un libro, mira en qué punto de venta está disponible y resérvalo para recogerlo sin prisas.',
    cta: { label: 'Explorar todos los libros', href: '#todos-los-libros' },
    covers: ['9789877254112', '9789681902551', '9788408053040'],
    tone: 'from-amber-900 via-orange-900 to-rose-900',
  },
];

const FAN = ['-rotate-6 translate-y-3', 'z-10 -mx-6 scale-110 sm:-mx-8', 'rotate-6 translate-y-3'];

function Chevron({ path }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 fill-none stroke-current"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const CONTROL =
  'grid place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function HomeHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const running = !paused && !hovered && !focused;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running]);

  const go = (step) => setIndex((i) => (i + step + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[index];

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      // Separado de la cabecera unos 1,5 cm: 24 px del padding de <main> más mt-7 (28 px).
      className="relative mx-[calc(50%-50vw)] mt-7 overflow-hidden"
    >
      {/* Con el avance automático, los cambios no se anuncian; en pausa, sí. */}
      <div aria-live={running ? 'off' : 'polite'}>
        <div
          key={index}
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${index + 1} de ${SLIDES.length}`}
          className={`relative bg-linear-to-r ${slide.tone} transition-opacity duration-700 starting:opacity-0 motion-reduce:transition-none`}
        >
          {/* Franja diagonal tras las portadas, como en los banners editoriales. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 hidden w-[46%] bg-white/10 [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)] md:block"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-12 pt-10 pb-16 sm:px-16 md:min-h-[22rem] md:grid-cols-[1.1fr_1fr] md:py-12">
            <div className="space-y-3 text-white">
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-300 uppercase">
                {slide.eyebrow}
              </p>
              <h2 className="text-3xl leading-tight font-bold sm:text-4xl">{slide.title}</h2>
              <p className="max-w-md text-base text-white/85">{slide.text}</p>
              <a
                href={slide.cta.href}
                className="mt-2 inline-block rounded-md bg-amber-400 px-5 py-2.5 text-sm font-bold text-stone-900 shadow-md transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {slide.cta.label}
              </a>
            </div>
            <div aria-hidden="true" className="flex items-end justify-center pb-2">
              {slide.covers.map((isbn, i) => (
                <div
                  key={isbn}
                  className={`w-20 shadow-2xl shadow-black/50 sm:w-28 md:w-32 lg:w-36 ${FAN[i]}`}
                >
                  <BookCover book={{ isbn }} size="fill" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        className={`absolute top-1/2 left-2 size-10 -translate-y-1/2 sm:left-4 ${CONTROL}`}
      >
        <Chevron path="M15 5l-7 7 7 7" />
        <span className="sr-only">Diapositiva anterior</span>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className={`absolute top-1/2 right-2 size-10 -translate-y-1/2 sm:right-4 ${CONTROL}`}
      >
        <Chevron path="M9 5l7 7-7 7" />
        <span className="sr-only">Diapositiva siguiente</span>
      </button>

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-current={i === index ? 'true' : undefined}
            onClick={() => setIndex(i)}
            className="grid h-6 place-items-center rounded-full px-0.5 focus-visible:outline-2 focus-visible:outline-white"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-amber-400' : 'w-2 bg-white/50'
              }`}
            />
            <span className="sr-only">
              Diapositiva {i + 1}: {s.title}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={`ml-2 size-7 ${CONTROL}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
            <path d={paused ? 'M8 5v14l11-7z' : 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'} />
          </svg>
          <span className="sr-only">{paused ? 'Reanudar el avance' : 'Pausar el avance'}</span>
        </button>
      </div>
    </section>
  );
}
