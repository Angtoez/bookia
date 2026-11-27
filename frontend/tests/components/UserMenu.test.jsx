import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { UserMenu, initials } = await import('../../src/components/UserMenu.jsx');

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
      <button type="button">Fuera</button>
    </MemoryRouter>,
  );
}

const asUser = (role, logout = vi.fn()) =>
  useAuth.mockReturnValue({
    user: { name: 'Ana López', email: 'ana@example.com', role },
    status: 'authenticated',
    logout,
  });

const toggle = () => screen.getByRole('button', { name: /menú de la cuenta/ });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initials', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(initials('ana lópez garcía')).toBe('AL');
    expect(initials('  Admin  ')).toBe('A');
    expect(initials('')).toBe('');
  });
});

describe('UserMenu', () => {
  it('sin sesión enlaza a iniciar sesión', () => {
    useAuth.mockReturnValue({ user: null, status: 'anonymous', logout: vi.fn() });
    renderMenu();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });

  it('despliega los enlaces del usuario y se cierra con Esc devolviendo el foco', async () => {
    const user = userEvent.setup();
    asUser('user');
    renderMenu();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('AL')).toBeInTheDocument();

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis reservas' })).toHaveAttribute(
      'href',
      '/me/reservations',
    );
    expect(screen.queryByRole('navigation', { name: 'Administración' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();
    expect(toggle()).toHaveFocus();
  });

  it('a un administrador le marca como tal y le da los enlaces de administración', async () => {
    const user = userEvent.setup();
    asUser('admin');
    renderMenu();
    expect(toggle()).toHaveAccessibleName(/administrador/);

    await user.click(toggle());
    const admin = screen.getByRole('navigation', { name: 'Administración' });
    expect(within(admin).getByRole('link', { name: 'Auditoría' })).toHaveAttribute(
      'href',
      '/admin/audit',
    );
    expect(screen.getByRole('link', { name: 'Mis favoritos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mis reservas' })).not.toBeInTheDocument();
  });

  it('se cierra al pulsar fuera y al elegir un enlace', async () => {
    const user = userEvent.setup();
    asUser('user');
    renderMenu();
    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle());
    await user.click(screen.getByRole('link', { name: 'Mis favoritos' }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('cierra la sesión', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue();
    asUser('user', logout);
    renderMenu();
    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalled();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });
});
