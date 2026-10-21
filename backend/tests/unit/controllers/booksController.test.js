// Pruebas unitarias del catálogo con los modelos de Mongoose mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/models/Book.js', () => ({ Book: { findById: vi.fn() } }));
vi.mock('../../../src/models/Genre.js', () => ({ Genre: { findOne: vi.fn() } }));
vi.mock('../../../src/models/StoreBook.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, StoreBook: { find: vi.fn() } };
});
vi.mock('../../../src/utils/pagination.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, paginate: vi.fn() };
});

const { Book } = await import('../../../src/models/Book.js');
const { Genre } = await import('../../../src/models/Genre.js');
const { StoreBook } = await import('../../../src/models/StoreBook.js');
const { paginate } = await import('../../../src/utils/pagination.js');
const { buildBookFilter, getBook, listBooks } =
  await import('../../../src/controllers/booksController.js');

// Encadena .select/.populate/.lean como hace Mongoose.
const chain = (value) => {
  const q = { select: () => q, populate: () => q, lean: async () => value };
  return q;
};
const mockRes = () => ({ json: vi.fn() });

const genre = { _id: 'g1', name: 'Novela', slug: 'novela' };
const book = {
  _id: 'b1',
  title: 'Cien años de soledad',
  author: 'Gabriel García Márquez',
  isbn: '9780307474728',
  genre_id: genre,
  price_cents: 30000,
};

beforeEach(() => vi.clearAllMocks());

describe('buildBookFilter', () => {
  it('busca en título y autor con el término normalizado y escapado', () => {
    const filter = buildBookFilter({ genreId: 'g1', q: ' CIEN Años.*' });
    expect(filter.genre_id).toBe('g1');
    const [{ title_search: pattern }] = filter.$or;
    expect(pattern.source).toBe('cien anos\\.\\*');
  });

  it('no añade $or sin término de búsqueda', () => {
    expect(buildBookFilter({ q: '   ' })).toEqual({});
  });
});

describe('listBooks', () => {
  it('devuelve una página vacía si el género no existe', async () => {
    Genre.findOne.mockReturnValue(chain(null));
    const res = mockRes();
    await listBooks({ validated: { query: { genre: 'nada' } } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ items: [], total: 0 }));
    expect(paginate).not.toHaveBeenCalled();
  });

  it('pagina y serializa como BookSummary', async () => {
    Genre.findOne.mockReturnValue(chain({ _id: 'g1' }));
    paginate.mockResolvedValue({ items: [book], page: 1, limit: 20, total: 1, total_pages: 1 });
    const res = mockRes();
    await listBooks({ validated: { query: { genre: 'novela', q: 'cien' } } }, res);
    expect(paginate.mock.calls[0][1].genre_id).toBe('g1');
    const body = res.json.mock.calls[0][0];
    expect(body.items[0]).toEqual({
      id: 'b1',
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: { id: 'g1', name: 'Novela', slug: 'novela' },
      price_cents: 30000,
    });
  });
});

describe('getBook', () => {
  it('lanza 404 si el libro no existe', async () => {
    Book.findById.mockReturnValue(chain(null));
    await expect(getBook({ validated: { params: { id: 'x' } } }, mockRes())).rejects.toMatchObject({
      status: 404,
    });
  });

  it('calcula precio efectivo, unidades disponibles y agotado', async () => {
    Book.findById.mockReturnValue(chain(book));
    const store = (id, name) => ({ _id: id, name, address: 'Dir', opening_hours: 'L–V' });
    StoreBook.find.mockReturnValue(
      chain([
        { store_id: store('s2', 'Zeta'), stock: 2, reserved_count: 2, store_price_cents: null },
        { store_id: store('s1', 'Alfa'), stock: 5, reserved_count: 1, store_price_cents: 25000 },
      ]),
    );
    const res = mockRes();
    await getBook({ validated: { params: { id: 'b1' } } }, res);
    const { stores } = res.json.mock.calls[0][0];
    expect(stores.map((s) => s.name)).toEqual(['Alfa', 'Zeta']);
    expect(stores[0]).toMatchObject({ price_cents: 25000, available: 4, is_sold_out: false });
    expect(stores[1]).toMatchObject({ price_cents: 30000, available: 0, is_sold_out: true });
  });
});
