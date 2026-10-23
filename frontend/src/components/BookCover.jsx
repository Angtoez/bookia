// Portada de un libro: la de Open Library si existe y, mientras carga o si no la hay, una portada
// genérica con el color del género. Es decorativa: el título ya se lee junto a ella.
import { useState } from 'react';
import { coverColor, coverUrl } from '../utils/bookCover.js';

const SIZES = {
  sm: { box: 'w-20', icon: 'size-8', brand: 'text-[0.5rem]', image: 'M' },
  lg: { box: 'w-32 sm:w-44', icon: 'size-14', brand: 'text-xs', image: 'L' },
};

function BookIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-white/85`}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
      <path d="M5 16.5a3 3 0 0 1 3-3h11M9 8.5h6" />
    </svg>
  );
}

/** @param {{book: {isbn?: string, genre?: {slug?: string}}, size?: 'sm'|'lg'}} props */
export function BookCover({ book, size = 'sm' }) {
  const { box, icon, brand, image } = SIZES[size];
  const url = coverUrl(book.isbn, image);
  // Se guarda la URL y no un booleano: si cambia el libro, el estado anterior deja de aplicar.
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);

  return (
    <div
      aria-hidden="true"
      className={`relative aspect-[2/3] shrink-0 overflow-hidden rounded-md shadow-sm ${box} ${coverColor(book.genre)}`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-black/20" />
      <div className="flex h-full flex-col items-center justify-center gap-2 px-2">
        <BookIcon className={icon} />
        {/* Hueco del logotipo de Bookia, cuando exista. */}
        <span className={`font-semibold tracking-widest text-white/80 uppercase ${brand}`}>
          Bookia
        </span>
      </div>
      {url && failedUrl !== url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${
            loadedUrl === url ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
