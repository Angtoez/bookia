// Ejecuta una lectura de la API cada vez que cambia `fetcher` (memorízalo con useCallback).
// El resultado se guarda junto al fetcher que lo produjo: así `loading` se deriva sin
// actualizar el estado dentro del efecto, y una respuesta antigua nunca pisa a una nueva.
import { useCallback, useEffect, useState } from 'react';

/**
 * @template T
 * @param {() => Promise<T>} fetcher
 * @returns {{data: T|undefined, error: any, loading: boolean, reload: () => void}}
 *   Mientras carga, `data` conserva el último resultado para evitar parpadeos.
 */
export function useApiQuery(fetcher) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({
    fetcher: null,
    version: -1,
    data: undefined,
    error: null,
  });

  useEffect(() => {
    let active = true;
    fetcher().then(
      (data) => active && setResult({ fetcher, version, data, error: null }),
      (error) => active && setResult({ fetcher, version, data: undefined, error }),
    );
    return () => {
      active = false;
    };
  }, [fetcher, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = result.fetcher !== fetcher || result.version !== version;
  return { data: result.data, error: loading ? null : result.error, loading, reload };
}
