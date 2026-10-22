// Utilidades comunes de los formularios de administración.

/** Solo los campos que cambian respecto al original (para los PATCH). */
export function changedFields(input, original) {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => value !== original[key]),
  );
}

export const lengthError = (value, max, label) =>
  value.trim().length > max ? `${label} admite como máximo ${max} caracteres` : null;

/**
 * Error de un texto obligatorio con longitud máxima. `label` lleva el artículo ("El nombre");
 * `missing` permite el femenino ("La dirección es obligatoria").
 */
export const requiredError = (value, max, label, missing = `${label} es obligatorio`) =>
  value.trim() ? lengthError(value, max, label) : missing;

/**
 * Reparte los `details` de un ApiError entre los campos del formulario.
 * @param {import('../services/apiClient.js').ApiError} error
 * @param {string[]} formFields campos que existen en el formulario.
 * @param {Record<string, string>} [rename] nombre en la API → nombre en el formulario.
 * @returns {{fields: Record<string, string>, general: any}} `general` si no encaja en ningún campo.
 */
export function apiFieldErrors(error, formFields, rename = {}) {
  const fields = {};
  for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
    const name = rename[field] ?? field;
    if (formFields.includes(name)) fields[name] = message;
  }
  return { fields, general: Object.keys(fields).length > 0 ? null : error };
}
