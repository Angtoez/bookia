// Favoritos del usuario con la disponibilidad actual de cada libro (US6, FR-022i).
import { Book } from '../models/Book.js';
import { Favorite } from '../models/Favorite.js';
import { StoreBook } from '../models/StoreBook.js';
import { notFound } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';
import { toBookSummary } from '../utils/presenters.js';

/** Cuenta, para cada libro, las tiendas con alguna unidad disponible (stock > reserved_count). */
export async function countStoresAvailable(bookIds) {
  if (bookIds.length === 0) return new Map();
  const rows = await StoreBook.aggregate([
    { $match: { book_id: { $in: bookIds }, $expr: { $gt: ['$stock', '$reserved_count'] } } },
    { $group: { _id: '$book_id', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

/** "Mis favoritos": del más reciente al más antiguo. */
export async function listFavorites(req, res) {
  const { page, limit } = req.validated.query;
  const result = await paginate(
    Favorite,
    { user_id: req.user._id },
    {
      sort: { created_at: -1, _id: -1 },
      populate: { path: 'book_id', populate: { path: 'genre_id', select: 'name slug' } },
      page,
      limit,
    },
  );
  // La cascada borra los favoritos de un libro borrado; el filtro cubre una baja simultánea.
  const books = result.items.map((f) => f.book_id).filter(Boolean);
  const available = await countStoresAvailable(books.map((b) => b._id));
  const items = books.map((book) => ({
    ...toBookSummary(book),
    is_favorite: true,
    stores_available: available.get(String(book._id)) ?? 0,
  }));
  res.json({ ...result, items });
}

export async function addFavorite(req, res) {
  const { bookId } = req.validated.params;
  if (!(await Book.exists({ _id: bookId }))) throw notFound('Libro no encontrado');
  const key = { user_id: req.user._id, book_id: bookId };
  try {
    await Favorite.updateOne(key, { $setOnInsert: key }, { upsert: true });
  } catch (err) {
    // Dos PUT simultáneos: el segundo choca con el índice único y el favorito ya existe.
    if (err?.code !== 11000) throw err;
  }
  res.status(204).end();
}

export async function removeFavorite(req, res) {
  await Favorite.deleteOne({ user_id: req.user._id, book_id: req.validated.params.bookId });
  res.status(204).end();
}
