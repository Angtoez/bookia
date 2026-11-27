import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/authService.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}));

const authService = await import('../../src/services/authService.js');
const { ApiError, UNAUTHORIZED_EVENT } = await import('../../src/services/apiClient.js');
const { AuthProvider } = await import('../../src/context/AuthContext.jsx');
const { LoginPage } = await import('../../src/pages/LoginPage.jsx');
const { RequireAdmin } = await import('../../src/components/RequireAdmin.jsx');

const admin = { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'admin' };

function renderApp(url, { onUnauthorized } = {}) {
  return render(
    <AuthProvider onUnauthorized={onUnauthorized}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Catálogo</p>} />
          <Route
            path="/admin/books"
            element={
              <RequireAdmin>
                <p>Gestión de libros</p>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.mocked(authService.login).mockReset();
  vi.mocked(authService.me).mockReset().mockResolvedValue(null);
});

describe('LoginPage', () => {
  it('inicia sesión y vuelve a next', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue(admin);
    renderApp('/login?next=%2Fadmin%2Fbooks');
    await user.type(screen.getByLabelText(/correo/i), ' ana@example.com ');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Gestión de libros')).toBeInTheDocument();
    expect(authService.login).toHaveBeenCalledWith('ana@example.com', 'secreto123');
  });

  it('muestra el mensaje de la API si las credenciales no son válidas', async () => {
    const user = userEvent.setup();
    authService.login.mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos'),
    );
    renderApp('/login');
    await user.type(screen.getByLabelText(/correo/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'mala');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(screen.getByText(/la cuenta se bloquea durante 15/)).toBeInTheDocument();
  });

  it('el botón del ojo muestra y oculta la contraseña', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    const password = screen.getByLabelText(/contraseña/i);
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(password).toHaveAttribute('type', 'password');
    await user.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(password).toHaveAttribute('type', 'password');
  });

  it('ignora un next externo', async () => {
    const user = userEvent.setup();
    authService.login.mockResolvedValue(admin);
    renderApp('/login?next=https%3A%2F%2Fevil.example');
    await user.type(screen.getByLabelText(/correo/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Catálogo')).toBeInTheDocument();
  });
});

describe('rutas protegidas', () => {
  it('sin sesión, RequireAdmin redirige al login', async () => {
    renderApp('/admin/books');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con sesión de usuario, RequireAdmin muestra Acceso denegado', async () => {
    authService.me.mockResolvedValue({ ...admin, role: 'user' });
    renderApp('/admin/books');
    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
  });

  it('un 401 de la API borra la sesión y avisa para ir al login', async () => {
    authService.me.mockResolvedValue(admin);
    const onUnauthorized = vi.fn();
    renderApp('/admin/books', { onUnauthorized });
    expect(await screen.findByText('Gestión de libros')).toBeInTheDocument();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});
