import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/accountService.js', () => ({ deleteAccount: vi.fn() }));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { deleteAccount } = await import('../../src/services/accountService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { DeleteAccountSection } = await import('../../src/components/DeleteAccountSection.jsx');

let clearSession;

function Home() {
  const { state } = useLocation();
  return <p>Portada: {state?.notice}</p>;
}

function renderSection() {
  return render(
    <MemoryRouter initialEntries={['/me/account']}>
      <Routes>
        <Route path="/me/account" element={<DeleteAccountSection />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );
}

const open = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }));
  return screen.getByRole('dialog');
};

beforeEach(() => {
  vi.clearAllMocks();
  clearSession = vi.fn();
  useAuth.mockReturnValue({ user: { name: 'Ana', role: 'user' }, clearSession });
});

describe('DeleteAccountSection', () => {
  it('explica las consecuencias antes de borrar y cancelar no llama a la API', async () => {
    const user = userEvent.setup();
    renderSection();
    expect(screen.getByText('Se cancelarán tus reservas activas')).toBeInTheDocument();
    expect(screen.getByText('No se puede deshacer')).toBeInTheDocument();
    const dialog = await open(user);
    expect(within(dialog).getByLabelText('Tu contraseña')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('muestra WRONG_PASSWORD junto al campo y LAST_ADMIN como mensaje', async () => {
    const user = userEvent.setup();
    deleteAccount.mockRejectedValueOnce(
      new ApiError(400, 'WRONG_PASSWORD', 'La contraseña actual no es correcta', [
        { field: 'password', message: 'La contraseña actual no es correcta' },
      ]),
    );
    renderSection();
    const dialog = await open(user);
    await user.type(within(dialog).getByLabelText('Tu contraseña'), 'mala-123');
    await user.click(within(dialog).getByRole('button', { name: 'Borrar la cuenta' }));
    expect(
      await within(dialog).findByText('La contraseña actual no es correcta'),
    ).toBeInTheDocument();

    deleteAccount.mockRejectedValueOnce(
      new ApiError(
        409,
        'LAST_ADMIN',
        'No puedes borrar tu cuenta: eres el último administrador activo',
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Borrar la cuenta' }));
    expect(
      await within(dialog).findByText(
        'No puedes borrar tu cuenta: eres el último administrador activo',
      ),
    ).toBeInTheDocument();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('no envía una contraseña vacía', async () => {
    const user = userEvent.setup();
    renderSection();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Borrar la cuenta' }));
    expect(within(dialog).getByText('Escribe tu contraseña para confirmar')).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('si va bien, cierra la sesión y vuelve a la portada con el aviso', async () => {
    const user = userEvent.setup();
    deleteAccount.mockResolvedValue(null);
    renderSection();
    const dialog = await open(user);
    await user.type(within(dialog).getByLabelText('Tu contraseña'), 'secreto123');
    await user.click(within(dialog).getByRole('button', { name: 'Borrar la cuenta' }));
    expect(deleteAccount).toHaveBeenCalledWith({ password: 'secreto123' });
    expect(await screen.findByText('Portada: Tu cuenta se ha borrado')).toBeInTheDocument();
    expect(clearSession).toHaveBeenCalled();
  });
});
