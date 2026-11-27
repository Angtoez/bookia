// Ayudas de los campos de contraseña, compartidas por el registro y el cambio de contraseña de
// Mi cuenta (feature 002): requisitos de la política y coincidencia de la repetición.
import { PASSWORD_RULES } from '../utils/passwordPolicy.js';

/** Requisitos de la contraseña, marcados según se cumplen mientras se escribe. */
export function PasswordChecklist({ password }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : ''}`}
          >
            <span aria-hidden="true" className="w-3 text-center">
              {ok ? '✓' : '○'}
            </span>
            {rule.label}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Indica bajo la confirmación si ya coincide con la contraseña. */
export function ConfirmHint({ password, confirm }) {
  const matches = confirm === password;
  return (
    <span role="status" className={matches ? 'text-emerald-700' : ''}>
      <span aria-hidden="true">{matches ? '✓ ' : '○ '}</span>
      {matches ? 'Las contraseñas coinciden' : 'Aún no coinciden'}
    </span>
  );
}
