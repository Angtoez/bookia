// Sesión de la SPA: usuario actual y acciones de inicio y cierre de sesión.
// La autorización real la aplica la API; esto solo decide qué se muestra (FR-007).
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { UNAUTHORIZED_EVENT } from '../services/apiClient.js';
import * as authService from '../services/authService.js';

export const AuthContext = createContext(null);

/**
 * @param {{children: React.ReactNode, onUnauthorized?: () => void}} props
 *   onUnauthorized: se llama cuando la API responde 401 (sesión caducada o cuenta desactivada).
 */
export function AuthProvider({ children, onUnauthorized }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .catch(() => null)
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        setStatus(current ? 'authenticated' : 'anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = () => {
      setUser(null);
      setStatus('anonymous');
      onUnauthorized?.();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handle);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handle);
  }, [onUnauthorized]);

  const login = useCallback(async (email, password) => {
    const current = await authService.login(email, password);
    setUser(current);
    setStatus('authenticated');
    return current;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  // Tras un registro, la API ya devuelve la cookie y el usuario.
  const updateUser = useCallback((current) => {
    setUser(current);
    setStatus(current ? 'authenticated' : 'anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, setUser: updateUser }),
    [user, status, login, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
