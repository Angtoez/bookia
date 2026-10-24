import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useBook.js', () => ({ useBook: vi.fn() }));
vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ status: 'anonymous', user: null }),
}));
vi.mock('../../src/services/configService.js', () => ({
  getConfig: vi.fn().mockResolvedValue({ currency: 'MXN' }),
}));
vi.mock('../../src/services/reviewsService.js', () => ({ getBookRating: vi.fn() }));
// El carrusel del pie tiene su propia lógica (BookShelf); aquí basta saber que se pide.
vi.mock('../../src/components/GenreShelf.jsx', () => ({
  GenreShelf: ({ genre, excludeId }) => (
    <p>
      Más de {genre.name} sin {excludeId}
    </p>
  ),
}));

const { useBook } = await import('../../src/hooks/useBook.js');
const { getBookRating } = await import('../../src/services/reviewsService.js');
const { BookDetailPage } = await import('../../src/pages/BookDetailPage.jsx');

const store = (n, extra = {}) => ({
  store_id: `s${n}`,
  name: `Tienda ${n}`,
  address: `Calle ${n}`,
  opening_hours: 'L–V 9:00–20:00',
  phone: null,
  price_cents: 19900,
  available: 3,
  is_sold_out: false,
  ...extra,
});

const book = (extra = {}) => ({
  id: 'b1',
  title: 'Demon Slayer 1',
  author: 'Koyoharu Gotouge',
  isbn: '9788467935110',
  genre: { name: 'Manga', slug: 'manga' },
  publisher: 'Norma Editorial',
  publication_year: 2016,
  price_cents: 19900,
  description: 'Tanjiro se hace cazador de demonios.',
  stores: [store(1, { price_cents: 16900 }), store(2, { is_sold_out: true, available: 0 })],
  ...extra,
});

function renderDetail(data) {
  useBook.mockReturnValue({ book: data, error: null, notFound: false, reload: vi.fn() });
  return render(
    <MemoryRouter initialEntries={['/books/b1']}>
      <Routes>
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getBookRating.mockResolvedValue(null);
});

describe('BookDetailPage', () => {
  it('muestra la ruta, el título, la sinopsis y la ficha técnica', () => {
    renderDetail(book());
    const crumbs = screen.getByRole('navigation', { name: 'Ruta' });
    expect(within(crumbs).getByRole('link', { name: 'Manga' })).toHaveAttribute(
      'href',
      '/?genre=manga',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Demon Slayer 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sinopsis' })).toBeInTheDocument();
    expect(screen.getByText('Tanjiro se hace cazador de demonios.')).toBeInTheDocument();
    expect(screen.getByText('Norma Editorial')).toBeInTheDocument();
    expect(screen.getByText('9788467935110')).toBeInTheDocument();
    expect(screen.getByText('Más de Manga sin b1')).toBeInTheDocument();
  });

  it('sin sinopsis no muestra esa sección', () => {
    renderDetail(book({ description: null }));
    expect(screen.queryByRole('heading', { name: 'Sinopsis' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ficha técnica' })).toBeInTheDocument();
  });

  it('resume la disponibilidad con el precio más bajo de las tiendas con unidades', async () => {
    renderDetail(book());
    const box = screen.getByRole('region', { name: 'Dónde encontrarlo' });
    const desde = await within(box).findByText('Desde');
    expect(desde.parentElement).toHaveTextContent(/Desde\s*169,00/);
    expect(within(box).getByText('Disponible en 1 librería')).toBeInTheDocument();
    expect(within(box).getByText('Quedan 3')).toBeInTheDocument();
    expect(within(box).getByText('Agotado')).toBeInTheDocument();
    // Un visitante ve la invitación a entrar solo en la tienda con unidades.
    expect(within(box).getAllByRole('link', { name: 'Inicia sesión para reservar' })).toHaveLength(
      1,
    );
    expect(within(box).getAllByText('Dirección y horario')).toHaveLength(2);
  });

  it('avisa si no hay tiendas o si está agotado en todas', () => {
    const { unmount } = renderDetail(book({ stores: [] }));
    expect(
      screen.getByText('Este libro no está disponible en ningún establecimiento.'),
    ).toBeInTheDocument();
    unmount();

    renderDetail(book({ stores: [store(1, { is_sold_out: true, available: 0 })] }));
    expect(screen.getByText('Agotado en todas las librerías por ahora.')).toBeInTheDocument();
  });

  it('muestra las estrellas si el libro tiene valoraciones', async () => {
    getBookRating.mockResolvedValue({ average: 4.48, count: 69 });
    renderDetail(book());
    expect(await screen.findByRole('img', { name: 'Valoración: 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('· 69 reseñas')).toBeInTheDocument();
    expect(getBookRating).toHaveBeenCalledWith('9788467935110');
  });
});
