import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/accountService.js', () => ({
  ACCOUNT_EXPORT_URL: '/api/account/export',
  getAccount: vi.fn(),
  updateAccount: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const accountService = await import('../../src/services/accountService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { MyAccountPage } = await import('../../src/pages/MyAccountPage.jsx');

const account = {
  id: 'u1',
  name: 'Ana López',
  email: 'ana@example.com',
  role: 'user',
  created_at: '2026-01-15T10:00:00.000Z',
};

let setUser;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/me/account']}>
      <MyAccountPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setUser = vi.fn();
  useAuth.mockReturnValue({
    user: { id: 'u1', name: 'Ana López', email: 'ana@example.com', role: 'user' },
    status: 'authenticated',
    setUser,
    clearSession: vi.fn(),
  });
  accountService.getAccount.mockResolvedValue(account);
});

describe('MyAccountPage: perfil', () => {
  it('muestra el nombre, el correo, el rol y la fecha de alta', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana López');
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(document.title).toBe('Mi cuenta · Bookia');
  });

  it('guarda el nombre nuevo y actualiza la cabecera', async () => {
    const user = userEvent.setup();
    accountService.updateAccount.mockResolvedValue({ ...account, name: 'Ana María' });
    renderPage();
    const field = await screen.findByLabelText('Nombre');
    await user.clear(field);
    await user.type(field, 'Ana María');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(accountService.updateAccount).toHaveBeenCalledWith({ name: 'Ana María' });
    expect(await screen.findByText('Nombre guardado')).toBeInTheDocument();
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana María' }));
  });

  it('no envía un nombre vacío y muestra los errores de la API junto al campo', async () => {
    const user = userEvent.setup();
    renderPage();
    const field = await screen.findByLabelText('Nombre');
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(accountService.updateAccount).not.toHaveBeenCalled();

    accountService.updateAccount.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
        { field: 'name', message: 'El nombre admite como máximo 100 caracteres' },
      ]),
    );
    await user.type(field, 'Otro');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('El nombre admite como máximo 100 caracteres'),
    ).toBeInTheDocument();
  });

  it('a un administrador le muestra su rol', async () => {
    accountService.getAccount.mockResolvedValue({ ...account, role: 'admin' });
    renderPage();
    expect(await screen.findByText('Administrador')).toBeInTheDocument();
  });
});
