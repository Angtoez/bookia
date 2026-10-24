// Icono de libro, provisional hasta que exista el logotipo de Bookia. Toma el color del texto
// (`currentColor`); public/favicon.svg repite el mismo trazo.
export function BookIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
      <path d="M5 16.5a3 3 0 0 1 3-3h11M9 8.5h6" />
    </svg>
  );
}
