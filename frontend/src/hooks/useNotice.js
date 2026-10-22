// Aviso de una sola vez que llega en el state de la navegación (p. ej. "Libro creado").
// Se copia al estado y se borra del historial, para que no reaparezca al recargar.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state?.notice ?? null;
  const [notice, setNotice] = useState(incoming);
  const [lastIncoming, setLastIncoming] = useState(incoming);

  // Un aviso nuevo sustituye al anterior. lastIncoming vuelve a null al borrar el state, así
  // que el mismo texto dos veces seguidas también se muestra.
  if (incoming !== lastIncoming) {
    setLastIncoming(incoming);
    if (incoming) setNotice(incoming);
  }

  useEffect(() => {
    if (incoming) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [incoming, location.pathname, location.search, navigate]);

  return [notice, setNotice];
}
