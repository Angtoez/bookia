// Aviso de éxito que los lectores de pantalla anuncian sin interrumpir.
export function Notice({ message, onDismiss }) {
  return (
    <div role="status" aria-live="polite">
      {message && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>{message}</p>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Cerrar aviso"
              className="rounded-md px-2 font-medium hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
