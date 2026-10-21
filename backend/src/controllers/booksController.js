// Catálogo público: listado con búsqueda y filtro, y detalle con puntos de venta (US1).
import { Book } from '../models/Book.js';
import { Genre } from '../models/Genre.js';
import { StoreBook } from '../models/StoreBook.js';
import { escapeRegExp } from '../utils/escapeRegExp.js';
import { notFound } from '../utils/httpError.js';
import { normalizeSearch } from '../utils/normalizeSearch.js';
import { buildPage, paginate, parsePagination } from '../utils/pagination.js';
import { toBookDetail, toBookSummary } from '../utils/presenters.js';

/**
 * Construye el filtro del catálogo. El término se normaliza y se escapa, así que
 * se busca como texto literal y nunca se interpola en un operador (principio II).
 */
export function buildBookFilter({ genreId, q }) {
  const filter = {};
  if (genreId) filter.genre_id = genreId;
  const term = normalizeSearch(q);
  if (term) {
    const pattern = new RegExp(escapeRegExp(term));
    filter.$or = [{ title_search: pattern }, { author_search: pattern }];
  }
  return filter;
}

export async function listBooks(req, res) {
  const { q, genre, page, limit } = req.validated.query;
  let genreId;
  if (genre) {
    const found = await Genre.findOne({ slug: genre }).select('_id').lean();
    if (!found) {
      const pagination = parsePagination({ page, limit });
      res.json(buildPage([], 0, pagination.page, pagination.limit));
      return;
    }
    genreId = found._id;
  }
  const result = await paginate(Book, buildBookFilter({ genreId, q }), {
    sort: { title_search: 1, _id: 1 },
    populate: { path: 'genre_id', select: 'name slug' },
    page,
    limit,
  });
  res.json({ ...result, items: result.items.map(toBookSummary) });
}

/** Carga un libro con su género y sus tiendas, o lanza 404. */
export async function loadBookDetail(id) {
  const book = await Book.findById(id).populate('genre_id', 'name slug').lean();
  if (!book) throw notFound('Libro no encontrado');
  const storeBooks = await StoreBook.find({ book_id: book._id }).populate('store_id').lean();
  return toBookDetail(book, storeBooks);
}

export async function getBook(req, res) {
  res.json(await loadBookDetail(req.validated.params.id));
}
