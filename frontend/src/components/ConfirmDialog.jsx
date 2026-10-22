// Diálogo modal de confirmación sobre <dialog>: el navegador gestiona el foco y la tecla Escape.
import { useEffect, useId, useRef } from 'react';

const BUTTON =
  'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60';

/**
 * @param {{open: boolean, title: string, children?: React.ReactNode, confirmLabel?: string,
 *   cancelLabel?: string, tone?: 'danger'|'default', busy?: boolean,
 *   onConfirm: () => void, onCancel: () => void}} props
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom no implementa showModal: en las pruebas basta con el atributo open.
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  const handleCancel = (event) => {
    // Escape: el estado lo controla el padre, no el navegador.
    event.preventDefault();
    if (!busy) onCancel();
  };

  const confirmTone =
    tone === 'danger'
      ? 'bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700'
      : 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onCancel={handleCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl backdrop:bg-stone-900/50"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold text-stone-900">
            {title}
          </h2>
          {children && (
            <div id={bodyId} className="space-y-2 text-sm text-stone-700">
              {children}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className={`${BUTTON} border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 focus-visible:outline-teal-700`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`${BUTTON} ${confirmTone}`}
            >
              {busy ? 'Procesando…' : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
