import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/authService.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  register: vi.fn(),
}));

const authService = await import('../../src/services/authService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { AuthProvider } = await import('../../src/context/AuthContext.jsx');
const { RegisterPage } = await import('../../src/pages/RegisterPage.jsx');
const { PASSWORD_POLICY_MESSAGE } = await import('../../src/utils/passwordPolicy.js');

function renderAt(url = '/register') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<p>Catálogo</p>} />
          <Route path="/me/favorites" element={<p>Mis favoritos</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fill(user, { name = 'Ana', email = 'ana@example.com', password, confirm }) {
  await user.type(screen.getByLabelText(/^nombre/i), name);
  await user.type(screen.getByLabelText(/correo/i), email);
  await user.type(screen.getByLabelText(/^contraseña/i), password);
  await user.type(screen.getByLabelText(/repite/i), confirm ?? password);
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

beforeEach(() => {
  vi.mocked(authService.me).mockReset().mockResolvedValue(null);
  vi.mocked(authService.register).mockReset();
});

describe('RegisterPage', () => {
  it('valida la política de contraseñas en el cliente con el mensaje de la API', async () => {
    const user = userEvent.setup();
    renderAt();
    await fill(user, { password: 'abcdefgh' });
    const password = screen.getByLabelText(/^contraseña/i);
    expect(screen.getByText(PASSWORD_POLICY_MESSAGE)).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveFocus();
    expect(authService.register).not.toHaveBeenCalled();

    // Tras el primer intento, el error desaparece al corregir la contraseña.
    await user.type(password, '1');
    expect(screen.queryByText(PASSWORD_POLICY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('exige nombre, correo válido y que coincidan las contraseñas', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El correo no es válido')).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre/i)).toHaveFocus();
  });

  it('un 409 EMAIL_TAKEN se muestra en el campo de correo', async () => {
    const user = userEvent.setup();
    authService.register.mockRejectedValue(
      new ApiError(409, 'EMAIL_TAKEN', 'Ese correo ya está registrado'),
    );
    renderAt();
    await fill(user, { password: 'secreto123' });
    const email = screen.getByLabelText(/correo/i);
    expect(await screen.findByText('Ese correo ya está registrado')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('los details de un 400 se muestran junto a cada campo', async () => {
    const user = userEvent.setup();
    authService.register.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
        { field: 'name', message: 'El nombre admite como máximo 100 caracteres' },
      ]),
    );
    renderAt();
    await fill(user, { password: 'secreto123' });
    expect(
      await screen.findByText('El nombre admite como máximo 100 caracteres'),
    ).toBeInTheDocument();
  });

  it('otros errores se muestran como mensaje general', async () => {
    const user = userEvent.setup();
    authService.register.mockRejectedValue(
      new ApiError(429, 'TOO_MANY_REQUESTS', 'Demasiadas peticiones, inténtalo más tarde'),
    );
    renderAt();
    await fill(user, { password: 'secreto123' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiadas peticiones');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('tras registrarse navega a next con los datos limpios', async () => {
    const user = userEvent.setup();
    authService.register.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'user' });
    renderAt('/register?next=%2Fme%2Ffavorites');
    await fill(user, { name: '  Ana  ', email: ' ana@example.com ', password: 'secreto123' });
    expect(await screen.findByText('Mis favoritos')).toBeInTheDocument();
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secreto123',
    });
  });

  it('sin next vuelve al catálogo, y el enlace al login conserva next', async () => {
    const user = userEvent.setup();
    authService.register.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'user' });
    const { unmount } = renderAt('/register?next=%2Fme%2Ffavorites');
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
      'href',
      '/login?next=%2Fme%2Ffavorites',
    );
    unmount();
    renderAt();
    await fill(user, { password: 'secreto123' });
    expect(await screen.findByText('Catálogo')).toBeInTheDocument();
  });
});
