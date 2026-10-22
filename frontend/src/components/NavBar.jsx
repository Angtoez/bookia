// Navegación principal: los enlaces dependen de si hay sesión y del rol.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
    isActive ? 'bg-teal-900 text-white' : 'text-teal-50 hover:bg-teal-800'
  }`;

export function NavBar() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const handleLogout = async () => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
      navigate('/');
    }
  };

  return (
    <nav aria-label="Principal" className="flex flex-wrap items-center gap-1">
      <NavLink to="/" end className={linkClass}>
        Catálogo
      </NavLink>
      {status === 'anonymous' && (
        <>
          <NavLink to="/login" className={linkClass}>
            Iniciar sesión
          </NavLink>
          <NavLink to="/register" className={linkClass}>
            Crear cuenta
          </NavLink>
        </>
      )}
      {user && (
        <>
          <span className="px-3 py-2 text-sm text-teal-100" title={user.email}>
            {user.name}
            {user.role === 'admin' && <span className="sr-only"> (administrador)</span>}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={leaving}
            className="rounded-md px-3 py-2 text-sm font-medium text-teal-50 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </>
      )}
    </nav>
  );
}
