// Protege rutas que exigen sesión: sin ella, redirige a /login?next=<ruta actual>.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { loginPathFor } from '../utils/safeNext.js';
import { Spinner } from './Spinner.jsx';

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Comprobando la sesión…" />;
  if (status !== 'authenticated') return <Navigate to={loginPathFor(location)} replace />;
  return children ?? <Outlet />;
}
