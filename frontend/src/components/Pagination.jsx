// Navegación entre páginas de un listado paginado ({page, total_pages}).
const BUTTON =
  'rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:cursor-not-allowed disabled:opacity-50';

export function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3 py-4">
      <button
        type="button"
        className={BUTTON}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className="text-sm text-stone-700">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className={BUTTON}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
