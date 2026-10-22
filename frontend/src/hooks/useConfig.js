// Configuración pública de la API (moneda, límites de reservas…), cacheada por configService.
import { useApiQuery } from './useApiQuery.js';
import { getConfig } from '../services/configService.js';

export function useConfig() {
  const { data } = useApiQuery(getConfig);
  return data ?? null;
}
