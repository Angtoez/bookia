// Iconos de trazo de los formularios de acceso. Son decorativos: la etiqueta del campo ya lo nombra.
function Icon({ className = 'size-5', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </Icon>
  );
}

export function LockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </Icon>
  );
}

export function UserIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0115 0" />
    </Icon>
  );
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10.6 5.1A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-2.9 3.9M6.6 6.6A17.4 17.4 0 002 12s3.5 7 10 7a9.9 9.9 0 005.4-1.6" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2M3 3l18 18" />
    </Icon>
  );
}
