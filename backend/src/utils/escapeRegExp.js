// Escapa los caracteres especiales de una expresión regular para buscar el texto literal.
export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
