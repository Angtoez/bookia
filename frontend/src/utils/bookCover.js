// Portadas: imagen de Open Library a partir del ISBN y color de la portada genérica según el género.
// Tailwind solo genera las clases que aparecen enteras en el código, así que la paleta es fija.
import { isValidIsbn, normalizeIsbn } from './isbn.js';

export const COVER_PALETTE = [
  'bg-teal-700',
  'bg-indigo-700',
  'bg-rose-700',
  'bg-amber-700',
  'bg-emerald-700',
  'bg-sky-700',
  'bg-violet-700',
  'bg-orange-700',
  'bg-cyan-700',
  'bg-fuchsia-700',
];

export const NO_GENRE_COLOR = 'bg-stone-500';

// Los géneros predefinidos (backend/src/scripts/genres.js) tienen color asignado para que los
// cercanos no coincidan; un género nuevo recibe uno de la paleta según su slug.
const GENRE_COLORS = {
  novela: 'bg-teal-700',
  'ciencia-ficcion': 'bg-indigo-700',
  fantasia: 'bg-violet-700',
  'misterio-y-suspense': 'bg-cyan-700',
  romantica: 'bg-rose-700',
  'novela-historica': 'bg-amber-700',
  poesia: 'bg-fuchsia-700',
  teatro: 'bg-orange-700',
  ensayo: 'bg-sky-700',
  'biografia-y-memorias': 'bg-emerald-700',
  infantil: 'bg-orange-700',
  juvenil: 'bg-sky-700',
  'comic-y-novela-grafica': 'bg-rose-700',
  autoayuda: 'bg-emerald-700',
  'ciencia-y-divulgacion': 'bg-indigo-700',
  historia: 'bg-amber-700',
  filosofia: 'bg-violet-700',
  arte: 'bg-fuchsia-700',
  cocina: 'bg-teal-700',
  viajes: 'bg-cyan-700',
};

function hash(text) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.codePointAt(0)) >>> 0;
  return h;
}

/** Clase de fondo de la portada genérica para un género ({slug}) o sin género. */
export function coverColor(genre) {
  const slug = genre?.slug;
  if (!slug) return NO_GENRE_COLOR;
  return GENRE_COLORS[slug] ?? COVER_PALETTE[hash(slug) % COVER_PALETTE.length];
}

/**
 * URL de la portada en Open Library, o null si el ISBN no es válido.
 * Con default=false responde 404 cuando no tiene la imagen, en vez de una imagen vacía.
 * @param {string} isbn ISBN-10 o ISBN-13.
 * @param {'M'|'L'} [size] M: unos 180 px de ancho; L: unos 500 px.
 */
export function coverUrl(isbn, size = 'M') {
  if (!isValidIsbn(isbn)) return null;
  return `https://covers.openlibrary.org/b/isbn/${normalizeIsbn(isbn)}-${size}.jpg?default=false`;
}
