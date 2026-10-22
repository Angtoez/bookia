import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/favoritesService.js', () => ({
  listFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock('../../src/services/configService.js', () => ({ getConfig: vi.fn() }));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const favorites = await import('../../src/services/favoritesService.js');
const { getConfig } = await import('../../src/services/configService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { MyFavoritesPage } = await import('../../src/pages/MyFavoritesPage.jsx');
const { BookCard } = await import('../../src/components/BookCard.jsx');

const book = (n, extra = {}) => ({
  id: `b${n}`,
  title: `Libro ${n}`,
  author: `Autor ${n}`,
  isbn: '9780307474728',
  genre: { id: 'g1', name: 'Novela', slug: 'novela' },
  price_cents: 1850,
  is_favorite: true,
  stores_available: 0,
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

function renderAt(url, element) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1' } });
  getConfig.mockResolvedValue({ currency: 'MXN' });
});

describe('MyFavoritesPage', () => {
  it('muestra la disponibilidad actual de cada libro', async () => {
    favorites.listFavorites.mockResolvedValue(
      page([book(1, { stores_available: 2 }), book(2, { stores_available: 1 }), book(3)]),
    );
    renderAt('/me/favorites', <MyFavoritesPage />);
    const [first, second, third] = await screen.findAllByRole('article');
    expect(within(first).getByText('Disponible en 2 establecimientos')).toBeInTheDocument();
    expect(within(second).getByText('Disponible en 1 establecimiento')).toBeInTheDocument();
    expect(within(third).getByText('Sin existencias')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('al quitar un favorito recarga la lista y desaparece', async () => {
    const user = userEvent.setup();
    favorites.listFavorites.mockResolvedValue(page([book(1), book(2)]));
    favorites.removeFavorite.mockResolvedValue(null);
    renderAt('/me/favorites', <MyFavoritesPage />);
    const [first] = await screen.findAllByRole('article');
    favorites.listFavorites.mockResolvedValue(page([book(2)]));
    await user.click(within(first).getByRole('button', { name: 'Quitar de favoritos' }));
    expect(favorites.removeFavorite).toHaveBeenCalledWith('b1');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(screen.queryByText('Libro 1')).toBeNull();
  });

  it('estado vacío con enlace al catálogo', async () => {
    favorites.listFavorites.mockResolvedValue(page([]));
    renderAt('/me/favorites', <MyFavoritesPage />);
    expect(await screen.findByText(/Todavía no has guardado ningún libro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '/');
  });
});

describe('FavoriteButton en BookCard', () => {
  it('un visitante ve un enlace al login con next', () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    renderAt('/?q=borges', <BookCard book={book(1, { is_favorite: undefined })} />);
    expect(
      screen.getByRole('link', { name: 'Inicia sesión para guardar «Libro 1» en favoritos' }),
    ).toHaveAttribute('href', '/login?next=%2F%3Fq%3Dborges');
  });

  it('marca como favorito y, si la API falla, vuelve atrás con el mensaje', async () => {
    const user = userEvent.setup();
    favorites.addFavorite.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Libro no encontrado'));
    renderAt('/', <BookCard book={book(1, { is_favorite: false })} />);
    const button = screen.getByRole('button', { name: 'Añadir a favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Libro no encontrado');
    expect(screen.getByRole('button', { name: 'Añadir a favoritos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
