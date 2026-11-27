// Política de contraseñas (FR-002): la misma regla y el mismo mensaje que la API
// (backend/src/validators/authValidators.js), para avisar antes de enviar el formulario.
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, con letras y números';

export const PASSWORD_MAX_LENGTH = 200;

/** Requisitos que se muestran uno a uno en el registro mientras se escribe. */
export const PASSWORD_RULES = [
  { label: 'Al menos 8 caracteres', test: (password) => password.length >= 8 },
  { label: 'Contiene letras', test: (password) => /[A-Za-z]/.test(password) },
  { label: 'Contiene números', test: (password) => /[0-9]/.test(password) },
];

export function meetsPasswordPolicy(password) {
  return (
    typeof password === 'string' &&
    password.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_RULES.every((rule) => rule.test(password))
  );
}
