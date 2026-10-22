// Destino tras iniciar sesión: solo rutas internas, para evitar redirecciones a otros sitios.
export function safeNext(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  if (value.startsWith('/\\') || value.startsWith('/login')) return fallback;
  return value;
}

/** Ruta de login que vuelve a la página actual (`/login?next=…`). */
export function loginPathFor(location) {
  const current = `${location.pathname}${location.search ?? ''}`;
  const next = safeNext(current, '');
  return next ? `/login?next=${encodeURIComponent(next)}` : '/login';
}
