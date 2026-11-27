// Tus datos (feature 002, US1): correo, rol y fecha de alta, y el nombre, que se puede cambiar.
// Al guardar, la cabecera muestra el nombre nuevo sin volver a entrar (FR-006).
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { updateAccount } from '../services/accountService.js';
import { requiredError } from '../utils/formHelpers.js';
import { AccountSection, PRIMARY_BUTTON } from './AccountSection.jsx';
import { FormField } from './FormField.jsx';
import { ButtonSpinner } from './Spinner.jsx';

const ROLE_LABELS = { user: 'Usuario', admin: 'Administrador' };
const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long' });

function ReadOnly({ label, children }) {
  return (
    <div>
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="mt-0.5 break-words text-stone-900">{children}</dd>
    </div>
  );
}

/** @param {{account: {name: string, email: string, role: string, created_at: string}}} props */
export function AccountProfileForm({ account }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(account.name);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    const invalid = requiredError(name, 100, 'El nombre');
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAccount({ name: name.trim() });
      setName(updated.name);
      setUser({ ...user, name: updated.name });
      setSaved(true);
    } catch (err) {
      setError(err.fieldErrors?.name ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountSection title="Tus datos">
      <dl className="grid gap-4 sm:grid-cols-3">
        <ReadOnly label="Correo electrónico">{account.email}</ReadOnly>
        <ReadOnly label="Rol">{ROLE_LABELS[account.role] ?? account.role}</ReadOnly>
        <ReadOnly label="Cuenta creada">{dateFormat.format(new Date(account.created_at))}</ReadOnly>
      </dl>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <FormField
          label="Nombre"
          name="name"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          error={error}
        />
        <p className="text-xs text-stone-600">
          El correo no se puede cambiar desde aquí. Si lo necesitas, escríbenos.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving && <ButtonSpinner />}
            Guardar
          </button>
          <p role="status" className="text-sm font-medium text-primary-800">
            {saved ? 'Nombre guardado' : ''}
          </p>
        </div>
      </form>
    </AccountSection>
  );
}
