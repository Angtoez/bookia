// Lista predefinida de géneros (FR-016) y su carga idempotente.
import { Genre } from '../models/Genre.js';
import { normalizeSearch } from '../utils/normalizeSearch.js';

export const GENRE_NAMES = [
  'Novela',
  'Ciencia ficción',
  'Fantasía',
  'Misterio y suspense',
  'Romántica',
  'Novela histórica',
  'Poesía',
  'Teatro',
  'Ensayo',
  'Biografía y memorias',
  'Infantil',
  'Juvenil',
  'Cómic y novela gráfica',
  'Manga',
  'Autoayuda',
  'Ciencia y divulgación',
  'Historia',
  'Filosofía',
  'Arte',
  'Cocina',
  'Viajes',
];

export const slugify = (name) => normalizeSearch(name).replace(/\s+/g, '-');

/** Inserta los géneros que falten (upsert por slug). Devuelve cuántos se crearon. */
export async function seedGenres() {
  let inserted = 0;
  for (const name of GENRE_NAMES) {
    const slug = slugify(name);
    const result = await Genre.updateOne(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true },
    );
    inserted += result.upsertedCount;
  }
  return inserted;
}
