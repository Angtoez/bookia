// Normaliza texto para la búsqueda: minúsculas, sin tildes y con espacios colapsados (research R6).
export function normalizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
