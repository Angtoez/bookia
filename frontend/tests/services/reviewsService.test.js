import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/booksService.js', () => ({ listBooks: vi.fn() }));
vi.mock('../../src/services/topRatedSample.js', () => ({
  TOP_RATED_SAMPLE: [
    { isbn: '9780000000001', title: 'Dune', average: 4.31, count: 455 },
    { isbn: '9780000000002', title: 'Momo', average: 4.5, count: 38 },
  ],
}));

const { listBooks } = await import('../../src/services/booksService.js');
const { getBookRating, listTopRated } = await import('../../src/services/reviewsService.js');

beforeEach(() => vi.clearAllMocks());

describe('listTopRated', () => {
  it('busca cada libro por título, elige la edición por ISBN y conserva el orden', async () => {
    listBooks.mockImplementation(async ({ q }) => ({
      items:
        q === 'Dune'
          ? [
              { id: 'otra', title: 'Dune', isbn: '9789999999999' },
              { id: 'b1', title: 'Dune', isbn: '9780000000001' },
            ]
          : [{ id: 'b2', title: 'Momo', isbn: '9780000000002' }],
    }));
    const result = await listTopRated();
    expect(listBooks).toHaveBeenCalledWith({ q: 'Dune' });
    expect(result.map((r) => r.book.id)).toEqual(['b1', 'b2']);
    expect(result[0].rating).toEqual({ average: 4.31, count: 455 });
  });

  it('getBookRating devuelve la valoración de un ISBN o null si no la hay', async () => {
    expect(await getBookRating('9780000000002')).toEqual({ average: 4.5, count: 38 });
    expect(await getBookRating('9789999999999')).toBeNull();
  });

  it('omite los libros que ya no están en el catálogo', async () => {
    listBooks.mockImplementation(async ({ q }) => ({
      items: q === 'Momo' ? [{ id: 'b2', title: 'Momo', isbn: '9780000000002' }] : [],
    }));
    const result = await listTopRated();
    expect(result.map((r) => r.book.id)).toEqual(['b2']);
  });
});
