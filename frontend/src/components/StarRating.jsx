// Valoración de 0 a 5 con estrellas (redondeada a medias estrellas) y la media en texto.
// Las estrellas son decorativas: la etiqueta accesible dice la nota exacta.
import { useId } from 'react';

const STAR =
  'M12 2.8l2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.13l-5.62 2.97 1.07-6.27L2.9 9.4l6.3-.9z';

export const formatRating = (value) =>
  value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** @param {{value: number, className?: string}} props value: media de 0 a 5. */
export function StarRating({ value, className = 'size-4' }) {
  // useId incluye caracteres que no valen dentro de url(#…).
  const clipId = `star-${useId().replace(/[^\w-]/g, '')}`;
  const halves = Math.round(value * 2);

  return (
    <span
      role="img"
      aria-label={`Valoración: ${formatRating(value)} de 5`}
      className="inline-flex items-center"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = halves >= (i + 1) * 2 ? 'full' : halves === i * 2 + 1 ? 'half' : 'empty';
        return (
          <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path d={STAR} className="fill-current opacity-30" />
            {fill === 'full' && <path d={STAR} className="fill-amber-400" />}
            {fill === 'half' && (
              <>
                <clipPath id={`${clipId}-${i}`}>
                  <rect width="12" height="24" />
                </clipPath>
                <path d={STAR} clipPath={`url(#${clipId}-${i})`} className="fill-amber-400" />
              </>
            )}
          </svg>
        );
      })}
    </span>
  );
}
