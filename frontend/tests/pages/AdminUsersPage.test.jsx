import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/usersService.js', () => ({
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const usersService = await import('../../src/services/usersService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { AdminUsersPage } = await import('../../src/pages/admin/AdminUsersPage.jsx');

const me = { id: 'u1', name: 'Ana Admin', email: 'ana@example.com', role: 'admin' };
const account = (id, extra = {}) => ({
  id,
  name: `Persona ${id}`,
  email: `${id}@example.com`,
  role: 'user',
  status: 'active',
  created_at: '2026-10-01T10:00:00.000Z',
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });
let setUser;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/" element={<p>Catálogo</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const rowOf = async (name) =>
  within((await screen.findByRole('rowheader', { name: new RegExp(name) })).closest('tr'));

beforeEach(() => {
  vi.clearAllMocks();
  setUser = vi.fn();
  useAuth.mockReturnValue({ user: me, setUser });
  usersService.listUsers.mockResolvedValue(
    page([account('u1', { name: 'Ana Admin', role: 'admin' }), account('u2')]),
  );
});

describe('AdminUsersPage', () => {
  it('muestra nombre, correo, rol, estado y fecha de alta, sin contraseñas', async () => {
    renderPage();
    const row = await rowOf('Persona u2');
    expect(row.getByText('u2@example.com')).toBeInTheDocument();
    expect(row.getByText('Usuario')).toBeInTheDocument();
    expect(row.getByText('Activa')).toBeInTheDocument();
    expect(row.getByText(/2026/)).toBeInTheDocument();
    expect((await rowOf('Ana Admin')).getByText('(tú)')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/password/i);
  });

  it('desactivar pide confirmación avisando de que se cancelarán sus reservas', async () => {
    const user = userEvent.setup();
    usersService.updateUser.mockResolvedValue(account('u2', { status: 'disabled' }));
    renderPage();
    await user.click(
      (await rowOf('Persona u2')).getByRole('button', { name: 'Desactivar: Persona u2' }),
    );
    const dialog = screen.getByRole('dialog', { name: '¿Desactivar la cuenta de Persona u2?' });
    expect(dialog).toHaveTextContent('se cancelarán sus reservas activas');
    expect(usersService.updateUser).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Desactivar' }));
    expect(usersService.updateUser).toHaveBeenCalledWith('u2', { status: 'disabled' });
    expect(
      await screen.findByText('Se ha desactivado la cuenta de Persona u2.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(usersService.listUsers).toHaveBeenCalledTimes(2));
  });

  it('muestra el mensaje de 409 LAST_ADMIN y no deja reintentar', async () => {
    const user = userEvent.setup();
    usersService.updateUser.mockRejectedValue(
      new ApiError(409, 'LAST_ADMIN', 'Debe quedar al menos un administrador activo'),
    );
    renderPage();
    await user.click(
      (await rowOf('Ana Admin')).getByRole('button', { name: 'Quitar administrador: Ana Admin' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Es tu propia cuenta.');
    await user.click(within(dialog).getByRole('button', { name: 'Quitar administrador' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Debe quedar al menos un administrador activo',
    );
    expect(within(dialog).getByRole('button', { name: 'Quitar administrador' })).toBeDisabled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it('promueve a un usuario', async () => {
    const user = userEvent.setup();
    usersService.updateUser.mockResolvedValue(account('u2', { role: 'admin' }));
    renderPage();
    await user.click(
      (await rowOf('Persona u2')).getByRole('button', { name: 'Hacer administrador: Persona u2' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Hacer administrador' }),
    );
    expect(usersService.updateUser).toHaveBeenCalledWith('u2', { role: 'admin' });
    expect(
      await screen.findByText('Persona u2 ahora tiene el rol de administrador.'),
    ).toBeInTheDocument();
  });

  it('quitarse el rol a uno mismo actualiza la sesión y sale de la administración', async () => {
    const user = userEvent.setup();
    usersService.updateUser.mockResolvedValue(account('u1', { name: 'Ana Admin', role: 'user' }));
    renderPage();
    await user.click(
      (await rowOf('Ana Admin')).getByRole('button', { name: 'Quitar administrador: Ana Admin' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar administrador' }),
    );
    expect(await screen.findByText('Catálogo')).toBeInTheDocument();
    expect(setUser).toHaveBeenCalledWith({ ...me, role: 'user' });
  });

  it('busca por nombre o correo', async () => {
    const user = userEvent.setup();
    renderPage();
    await rowOf('Persona u2');
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'ana');
    await waitFor(() =>
      expect(usersService.listUsers).toHaveBeenLastCalledWith({ q: 'ana', page: 1 }),
    );
  });
});
