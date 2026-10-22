import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/** @returns {{user: object|null, status: 'loading'|'authenticated'|'anonymous',
 *   login: Function, logout: Function, setUser: Function}} */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
