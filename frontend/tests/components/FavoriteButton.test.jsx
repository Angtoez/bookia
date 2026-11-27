import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/hooks/useFavorites.js', () => ({
  useFavoriteToggle: () => ({ isFavorite: false, pending: false, error: null, toggle: vi.fn() }),
}));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { FavoriteButton } = await import('../../src/components/FavoriteButton.jsx');

const book = { id: 'b1', title: 'Dune', is_favorite: false };
const renderButton = () =>
  render(
    <MemoryRouter initialEntries={['/books/b1']}>
      <FavoriteButton book={book} />
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe('FavoriteButton', () => {
  it('a un visitante le lleva a iniciar sesión', () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    renderButton();
    expect(
      screen.getByRole('link', { name: 'Inicia sesión para guardar «Dune» en favoritos' }),
    ).toHaveAttribute('href', expect.stringContaining('/login'));
  });

  it('a un usuario le deja marcarlo', () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { role: 'user' } });
    renderButton();
    expect(screen.getByRole('button', { name: 'Añadir a favoritos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('al administrador no se le muestra, porque no guarda favoritos', () => {
    useAuth.mockReturnValue({ status: 'authenticated', user: { role: 'admin' } });
    const { container } = renderButton();
    expect(container).toBeEmptyDOMElement();
  });
});
