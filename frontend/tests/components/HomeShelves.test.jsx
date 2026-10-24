import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/reviewsService.js', () => ({ listTopRated: vi.fn() }));
vi.mock('../../src/services/booksService.js', () => ({ listBooks: vi.fn() }));

const { listTopRated } = await import('../../src/services/reviewsService.js');
const { listBooks } = await import('../../src/services/booksService.js');
const { ComicsMangaShelf, TopRatedShelf, interleave } =
  await import('../../src/components/HomeShelves.jsx');

const book = (id, slug = 'manga') => ({
  id,
  title: `Libro ${id}`,
  author: `Autor ${id}`,
  isbn: '9780307474728',
  genre: { name: slug, slug },
});

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

describe('interleave', () => {
  it('alterna las listas hasta el tamaño pedido', () => {
    expect(interleave([[1, 2, 3], ['a']], 4)).toEqual([1, 'a', 2, 3]);
    expect(
      interleave(
        [
          [1, 2],
          ['a', 'b'],
        ],
        3,
      ),
    ).toEqual([1, 'a', 2]);
  });
});

describe('TopRatedShelf', () => {
  it('muestra los libros en orden, con su puesto, valoración y reseñas, enlazando al detalle', async () => {
    listTopRated.mockResolvedValue([
      { book: book('b1'), rating: { average: 4.6, count: 1203 } },
      { book: book('b2'), rating: { average: 4.25, count: 87 } },
    ]);
    renderIn(<TopRatedShelf />);
    const section = screen.getByRole('region', {
      name: 'Los mejor valorados | Elegidos por los lectores',
    });
    const links = await within(section).findAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/books/b1');
    expect(links[0]).toHaveTextContent('Nº 1');
    expect(links[0]).toHaveTextContent('Ver disponibilidad');
    expect(within(links[0]).getByRole('img', { name: 'Valoración: 4,6 de 5' })).toBeInTheDocument();
    expect(links[0]).toHaveTextContent('1203 reseñas');
    expect(within(links[1]).getByRole('img', { name: 'Valoración: 4,3 de 5' })).toBeInTheDocument();
  });

  it('empieza con la flecha de anteriores desactivada', async () => {
    listTopRated.mockResolvedValue([{ book: book('b1'), rating: { average: 4.6, count: 10 } }]);
    renderIn(<TopRatedShelf />);
    await screen.findAllByRole('link');
    expect(screen.getByRole('button', { name: 'Anteriores' })).toBeDisabled();
  });

  it('no se muestra si los datos fallan', async () => {
    listTopRated.mockRejectedValue(new Error('Sin conexión'));
    const { container } = renderIn(<TopRatedShelf />);
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('ComicsMangaShelf', () => {
  it('alterna manga y cómic con su etiqueta y enlaza a cada género', async () => {
    listBooks.mockImplementation(async ({ genre }) => ({
      items: genre === 'manga' ? [book('m1'), book('m2')] : [book('c1', 'comic-y-novela-grafica')],
    }));
    renderIn(<ComicsMangaShelf />);
    const section = screen.getByRole('region', { name: 'Cómics, manga y novela gráfica' });
    await within(section).findByRole('link', { name: /Libro m1/ });
    const books = within(section)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href').startsWith('/books/'));
    expect(books.map((link) => link.getAttribute('href'))).toEqual([
      '/books/m1',
      '/books/c1',
      '/books/m2',
    ]);
    expect(books[1]).toHaveTextContent('Cómic');
    expect(within(section).getByRole('link', { name: 'Ver todo el manga' })).toHaveAttribute(
      'href',
      '/?genre=manga',
    );
    expect(listBooks).toHaveBeenCalledWith({ genre: 'manga', limit: 12 });
  });
});
