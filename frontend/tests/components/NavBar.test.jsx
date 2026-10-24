import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/configService.js', () => ({ listGenres: vi.fn() }));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { listGenres } = await import('../../src/services/configService.js');
const { NavBar, NavUser } = await import('../../src/components/NavBar.jsx');

function renderNav(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <NavBar />
      <NavUser />
    </MemoryRouter>,
  );
}

const openMenu = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
  return screen.getByRole('dialog', { name: 'Menú' });
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null, status: 'anonymous', logout: vi.fn() });
  listGenres.mockResolvedValue([
    { id: 'g1', name: 'Novela', slug: 'novela' },
    { id: 'g2', name: 'Manga', slug: 'manga' },
  ]);
});

describe('NavBar', () => {
  it('abre el panel con el botón y lo cierra con el botón de cerrar y con Escape', async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Abrir menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const dialog = await openMenu(user);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openMenu(user);
    // jsdom no lanza "cancel" con Escape: se simula como lo haría el navegador.
    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('sin sesión ofrece entrar y crear cuenta, y se cierra al navegar', async () => {
    const user = userEvent.setup();
    renderNav();
    const dialog = await openMenu(user);
    expect(within(dialog).getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('link', { name: 'Iniciar sesión' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista los géneros como enlaces al catálogo que conservan la búsqueda', async () => {
    const user = userEvent.setup();
    renderNav('/?q=dune&genre=novela');
    const dialog = await openMenu(user);
    const genres = within(dialog).getByRole('navigation', { name: 'Géneros' });
    expect(await within(genres).findByRole('link', { name: 'Manga' })).toHaveAttribute(
      'href',
      '/?q=dune&genre=manga',
    );
    expect(within(genres).getByRole('link', { name: 'Novela' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(genres).getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/?q=dune');
  });

  it('con sesión de usuario muestra su nombre en la cabecera y sus enlaces en el panel', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue();
    useAuth.mockReturnValue({
      user: { name: 'Ana', email: 'ana@example.com', role: 'user' },
      status: 'authenticated',
      logout,
    });
    renderNav();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    const dialog = await openMenu(user);
    expect(within(dialog).getByRole('link', { name: 'Mis reservas' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Libros' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalled();
  });

  it('a un administrador le muestra la sección de administración', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { name: 'Admin', email: 'admin@example.com', role: 'admin' },
      status: 'authenticated',
      logout: vi.fn(),
    });
    renderNav();
    const dialog = await openMenu(user);
    expect(within(dialog).getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Mis reservas' })).not.toBeInTheDocument();
  });
});
