// Pruebas unitarias de favoritos con los modelos mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/models/Book.js', () => ({ Book: { exists: vi.fn() } }));
vi.mock('../../../src/models/Favorite.js', () => ({
  Favorite: { updateOne: vi.fn(), deleteOne: vi.fn() },
}));
vi.mock('../../../src/models/StoreBook.js', () => ({ StoreBook: { aggregate: vi.fn() } }));
vi.mock('../../../src/utils/pagination.js', () => ({ paginate: vi.fn() }));

const { Book } = await import('../../../src/models/Book.js');
const { Favorite } = await import('../../../src/models/Favorite.js');
const { StoreBook } = await import('../../../src/models/StoreBook.js');
const { paginate } = await import('../../../src/utils/pagination.js');
const { addFavorite, countStoresAvailable, listFavorites, removeFavorite } =
  await import('../../../src/controllers/favoritesController.js');

const user = { _id: 'u1' };
const mockRes = () => {
  const res = { json: vi.fn(), end: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};
const book = (id) => ({
  _id: id,
  title: `Libro ${id}`,
  author: 'Autor',
  isbn: '9780307474728',
  genre_id: { _id: 'g1', name: 'Novela', slug: 'novela' },
  price_cents: 1000,
});

beforeEach(() => vi.clearAllMocks());

describe('countStoresAvailable', () => {
  it('no consulta si no hay libros', async () => {
    expect((await countStoresAvailable([])).size).toBe(0);
    expect(StoreBook.aggregate).not.toHaveBeenCalled();
  });
});

describe('listFavorites', () => {
  it('filtra por el usuario y añade stores_available', async () => {
    paginate.mockResolvedValue({
      items: [{ book_id: book('b1') }, { book_id: null }, { book_id: book('b2') }],
      page: 1,
      limit: 20,
      total: 3,
      total_pages: 1,
    });
    StoreBook.aggregate.mockResolvedValue([{ _id: 'b1', count: 2 }]);
    const res = mockRes();
    await listFavorites({ user, validated: { query: {} } }, res);
    expect(paginate.mock.calls[0][1]).toEqual({ user_id: 'u1' });
    const { items } = res.json.mock.calls[0][0];
    expect(items.map((i) => [i.id, i.stores_available, i.is_favorite])).toEqual([
      ['b1', 2, true],
      ['b2', 0, true],
    ]);
  });
});

describe('addFavorite', () => {
  const req = { user, validated: { params: { bookId: 'b1' } } };

  it('responde 404 si el libro no existe', async () => {
    Book.exists.mockResolvedValue(null);
    await expect(addFavorite(req, mockRes())).rejects.toMatchObject({ status: 404 });
    expect(Favorite.updateOne).not.toHaveBeenCalled();
  });

  it('hace un upsert y responde 204', async () => {
    Book.exists.mockResolvedValue({ _id: 'b1' });
    const res = mockRes();
    await addFavorite(req, res);
    const key = { user_id: 'u1', book_id: 'b1' };
    expect(Favorite.updateOne).toHaveBeenCalledWith(key, { $setOnInsert: key }, { upsert: true });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('ignora el choque con el índice único de un PUT simultáneo', async () => {
    Book.exists.mockResolvedValue({ _id: 'b1' });
    Favorite.updateOne.mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));
    const res = mockRes();
    await addFavorite(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('propaga cualquier otro error', async () => {
    Book.exists.mockResolvedValue({ _id: 'b1' });
    Favorite.updateOne.mockRejectedValue(new Error('caída'));
    await expect(addFavorite(req, mockRes())).rejects.toThrow('caída');
  });
});

describe('removeFavorite', () => {
  it('borra solo el favorito del usuario y responde 204', async () => {
    const res = mockRes();
    await removeFavorite({ user, validated: { params: { bookId: 'b1' } } }, res);
    expect(Favorite.deleteOne).toHaveBeenCalledWith({ user_id: 'u1', book_id: 'b1' });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
