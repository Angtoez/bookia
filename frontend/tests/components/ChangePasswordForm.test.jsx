import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/accountService.js', () => ({ changePassword: vi.fn() }));

const { changePassword } = await import('../../src/services/accountService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { ChangePasswordForm } = await import('../../src/components/ChangePasswordForm.jsx');
const { PASSWORD_POLICY_MESSAGE } = await import('../../src/utils/passwordPolicy.js');

const fields = () => ({
  current: screen.getByLabelText('Contraseña actual'),
  next: screen.getByLabelText('Nueva contraseña'),
  confirm: screen.getByLabelText('Repite la nueva contraseña'),
});

async function fill(user, { current = 'actual-123', next = 'nueva-clave9', confirm = next }) {
  const f = fields();
  if (current) await user.type(f.current, current);
  if (next) await user.type(f.next, next);
  if (confirm) await user.type(f.confirm, confirm);
}

const submit = (user) => user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

beforeEach(() => vi.clearAllMocks());

describe('ChangePasswordForm', () => {
  it('marca los requisitos de la política mientras se escribe', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await user.type(fields().next, 'abcdefgh');
    expect(screen.getByText('Al menos 8 caracteres')).toHaveTextContent('(cumplido)');
    expect(screen.getByText('Contiene números')).toHaveTextContent('(pendiente)');
  });

  it('valida en el cliente la política y la repetición sin llamar a la API', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(user, { next: 'sinnumeros', confirm: 'otra' });
    await submit(user);
    expect(screen.getByText(PASSWORD_POLICY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('muestra WRONG_PASSWORD junto a la contraseña actual', async () => {
    const user = userEvent.setup();
    changePassword.mockRejectedValue(
      new ApiError(400, 'WRONG_PASSWORD', 'La contraseña actual no es correcta', [
        { field: 'current_password', message: 'La contraseña actual no es correcta' },
      ]),
    );
    render(<ChangePasswordForm />);
    await fill(user, {});
    await submit(user);
    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument();
    expect(fields().current).toHaveAttribute('aria-invalid', 'true');
  });

  it('si va bien, vacía los campos y confirma el cambio', async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue(null);
    render(<ChangePasswordForm />);
    await fill(user, {});
    await submit(user);
    expect(changePassword).toHaveBeenCalledWith({
      current_password: 'actual-123',
      new_password: 'nueva-clave9',
    });
    expect(await screen.findByText('Contraseña cambiada')).toBeInTheDocument();
    expect(fields().current).toHaveValue('');
    expect(fields().next).toHaveValue('');
  });
});
