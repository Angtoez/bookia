// Indica si se cumple una media query (p. ej. el ancho de escritorio) y se actualiza al cambiar.
// Sin matchMedia (jsdom en las pruebas) devuelve false, es decir, se comporta como en móvil.
import { useCallback, useSyncExternalStore } from 'react';

/** Ancho a partir del cual se usa la cabecera de escritorio (el breakpoint `sm` de Tailwind). */
export const DESKTOP_QUERY = '(min-width: 640px)';

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
