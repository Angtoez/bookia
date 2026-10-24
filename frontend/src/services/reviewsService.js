// Libros mejor valorados. Bookia aún no tiene reseñas propias (llegarán en una feature
// posterior): mientras tanto se usan las valoraciones reales de Open Library de los libros del
// catálogo (topRatedSample.js). Cuando exista el endpoint, solo hay que cambiar esta función.
import { listBooks } from './booksService.js';
import { TOP_RATED_SAMPLE } from './topRatedSample.js';

/** [{book: BookSummary, rating: {average, count}}], de mejor a peor valorado. */
export async function listTopRated() {
  const found = await Promise.all(
    TOP_RATED_SAMPLE.map(async ({ isbn, title, average, count }) => {
      // La API aún no busca por ISBN: se busca por título y se elige la edición exacta.
      const page = await listBooks({ q: title });
      const book = page.items.find((item) => item.isbn === isbn);
      return book ? { book, rating: { average, count } } : null;
    }),
  );
  // Un libro que ya no está en el catálogo (borrado o editado) simplemente no aparece.
  return found.filter(Boolean);
}

/** {average, count} de un libro por su ISBN, o null si aún no tiene valoraciones. */
export async function getBookRating(isbn) {
  const entry = TOP_RATED_SAMPLE.find((item) => item.isbn === isbn);
  return entry ? { average: entry.average, count: entry.count } : null;
}
