// Secciones con carrusel de la portada: los mejor valorados y los cómics y mangas.
import { useApiQuery } from '../hooks/useApiQuery.js';
import { listBooks } from '../services/booksService.js';
import { listTopRated } from '../services/reviewsService.js';
import { BookShelf, ShelfAction } from './BookShelf.jsx';
import { StarRating, formatRating } from './StarRating.jsx';

const SHELF_SIZE = 12;

/** Alterna los libros de varias listas (a, b, a, b…) hasta `size`. */
export function interleave(lists, size) {
  const result = [];
  for (let i = 0; result.length < size && lists.some((list) => i < list.length); i += 1) {
    for (const list of lists) if (i < list.length && result.length < size) result.push(list[i]);
  }
  return result;
}

async function loadComicsAndManga() {
  const [manga, comics] = await Promise.all([
    listBooks({ genre: 'manga', limit: SHELF_SIZE }),
    listBooks({ genre: 'comic-y-novela-grafica', limit: SHELF_SIZE }),
  ]);
  return interleave([manga.items, comics.items], SHELF_SIZE);
}

export function TopRatedShelf() {
  const { data, error } = useApiQuery(listTopRated);
  // Es un extra: si falla, la portada sigue sin esta sección.
  if (error) return null;

  const items = data?.map(({ book, rating }, index) => ({
    book,
    badge: `Nº ${index + 1}`,
    meta: (
      <span className="flex items-center gap-1.5">
        <StarRating value={rating.average} className="size-3.5 text-stone-400" />
        <span className="font-semibold text-stone-800">{formatRating(rating.average)}</span>
        <span>
          ({rating.count.toLocaleString('es')}
          <span className="sr-only"> reseñas</span>)
        </span>
      </span>
    ),
  }));

  return (
    <BookShelf
      id="mejor-valorados"
      title="Los mejor valorados | Elegidos por los lectores"
      subtitle="Las lecturas con mejores reseñas de nuestro catálogo, según Open Library."
      items={items}
    />
  );
}

export function ComicsMangaShelf() {
  const { data, error } = useApiQuery(loadComicsAndManga);
  if (error) return null;

  const items = data?.map((book) => ({
    book,
    badge: book.genre?.slug === 'manga' ? 'Manga' : 'Cómic',
  }));

  return (
    <BookShelf
      id="comics-y-manga"
      tone="muted"
      title="Cómics, manga y novela gráfica"
      subtitle="Bienvenido al universo de los mejores ilustradores e historias."
      items={items}
      actions={
        <>
          <ShelfAction to="/?genre=manga">Ver todo el manga</ShelfAction>
          <ShelfAction to="/?genre=comic-y-novela-grafica">Ver todos los cómics</ShelfAction>
        </>
      }
    />
  );
}
