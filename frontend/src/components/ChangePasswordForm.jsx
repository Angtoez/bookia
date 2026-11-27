// Cambio de contraseña (feature 002, US2): la actual, la nueva con la política del registro y su
// repetición. Tras el cambio, esta sesión sigue abierta y las demás se cierran (FR-011).
import { useState } from 'react';
import { changePassword } from '../services/accountService.js';
import { PASSWORD_POLICY_MESSAGE, meetsPasswordPolicy } from '../utils/passwordPolicy.js';
import { AccountSection, PRIMARY_BUTTON } from './AccountSection.jsx';
import { LockIcon } from './AuthIcons.jsx';
import { FormField } from './FormField.jsx';
import { ConfirmHint, PasswordChecklist } from './PasswordHints.jsx';
import { ButtonSpinner } from './Spinner.jsx';

const EMPTY = { current: '', next: '', confirm: '' };
// Nombres de los campos en la API → en el formulario.
const API_FIELDS = { current_password: 'current', new_password: 'next' };

export function validatePasswordChange({ current, next, confirm }) {
  const errors = {};
  if (!current) errors.current = 'Escribe tu contraseña actual';
  if (!meetsPasswordPolicy(next)) errors.next = PASSWORD_POLICY_MESSAGE;
  if (confirm !== next) errors.confirm = 'Las contraseñas no coinciden';
  return errors;
}

export function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setDone(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const invalid = validatePasswordChange(form);
    setErrors(invalid);
    setGeneral(null);
    if (Object.keys(invalid).length > 0) return;
    setSaving(true);
    try {
      await changePassword({ current_password: form.current, new_password: form.next });
      setForm(EMPTY);
      setDone(true);
    } catch (err) {
      const fields = {};
      for (const [field, message] of Object.entries(err.fieldErrors ?? {})) {
        fields[API_FIELDS[field] ?? field] = message;
      }
      setErrors(fields);
      if (Object.keys(fields).length === 0) setGeneral(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountSection
      title="Contraseña"
      description="Al cambiarla, se cerrará tu sesión en los demás dispositivos."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Contraseña actual"
          name="current"
          type="password"
          autoComplete="current-password"
          revealable
          icon={<LockIcon />}
          maxLength={200}
          value={form.current}
          onChange={update}
          error={errors.current}
        />
        <FormField
          label="Nueva contraseña"
          name="next"
          type="password"
          autoComplete="new-password"
          revealable
          icon={<LockIcon />}
          maxLength={200}
          value={form.next}
          onChange={update}
          error={errors.next}
          hint={<PasswordChecklist password={form.next} />}
        />
        <FormField
          label="Repite la nueva contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          revealable
          icon={<LockIcon />}
          maxLength={200}
          value={form.confirm}
          onChange={update}
          error={errors.confirm}
          hint={
            form.confirm ? <ConfirmHint password={form.next} confirm={form.confirm} /> : undefined
          }
        />
        {general && (
          <p role="alert" className="text-sm text-red-700">
            {general}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving && <ButtonSpinner />}
            Cambiar contraseña
          </button>
          <p role="status" className="text-sm font-medium text-primary-800">
            {done ? 'Contraseña cambiada' : ''}
          </p>
        </div>
      </form>
    </AccountSection>
  );
}
