// Indicador de carga accesible: los lectores de pantalla anuncian el texto.
export function Spinner({ label = 'Cargando…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-stone-600">
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-primary-700"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Rueda pequeña para dentro de un botón; el texto del botón ya dice qué está pasando. */
export function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}
