// Aviso de una sola vez que llega en location.state.notice (p. ej. «Tu cuenta se ha borrado»,
// feature 002). Va entre la cabecera y el contenido y se quita al cerrarlo o al navegar.
import { useLocation, useNavigate } from 'react-router';

export function FlashNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const notice = location.state?.notice;
  if (!notice) return null;

  // Se borra el estado de la entrada actual, para que no reaparezca al recargar o volver.
  const dismiss = () =>
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });

  return (
    <div role="status" className="border-b border-primary-200 bg-primary-50 text-primary-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-sm">
        <p className="font-medium">{notice}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar el aviso"
          className="rounded-md px-2 py-1 font-medium text-primary-800 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
