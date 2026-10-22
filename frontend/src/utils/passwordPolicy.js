// Política de contraseñas (FR-002): la misma regla y el mismo mensaje que la API
// (backend/src/validators/authValidators.js), para avisar antes de enviar el formulario.
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, con letras y números';

export const PASSWORD_MAX_LENGTH = 200;

export function meetsPasswordPolicy(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
