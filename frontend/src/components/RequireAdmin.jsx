// Como RequireAuth, pero además exige el rol admin; si no lo tiene, muestra ForbiddenPage.
import { Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { ForbiddenPage } from '../pages/ForbiddenPage.jsx';
import { RequireAuth } from './RequireAuth.jsx';

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <ForbiddenPage />;
  return children ?? <Outlet />;
}

export function RequireAdmin({ children }) {
  return (
    <RequireAuth>
      <AdminOnly>{children}</AdminOnly>
    </RequireAuth>
  );
}
