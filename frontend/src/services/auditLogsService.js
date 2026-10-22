// Auditoría, solo lectura (contracts/rest-api.md § Usuarios y auditoría, FR-028).
import { apiRequest } from './apiClient.js';

/** Página de entradas, de la más reciente a la más antigua. */
export const listAuditLogs = ({ entity_type: entityType, page, limit } = {}) =>
  apiRequest('/auditLogs', { query: { entity_type: entityType, page, limit } });
