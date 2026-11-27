// Borrar la cuenta (feature 002, US3): zona marcada como peligrosa, con las consecuencias y una
// confirmación con la contraseña. Al terminar, la sesión se vacía y se vuelve a la portada.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { deleteAccount } from '../services/accountService.js';
import { AccountSection } from './AccountSection.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { FormField } from './FormField.jsx';

const CONSEQUENCES = [
  'Se cancelarán tus reservas activas',
  'Se borrarán tus favoritos',
  'No se puede deshacer',
];

export function DeleteAccountSection() {
  const { clearSession } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [general, setGeneral] = useState(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setFieldError(null);
    setGeneral(null);
  };

  const confirm = async () => {
    setGeneral(null);
    if (!password) {
      setFieldError('Escribe tu contraseña para confirmar');
      return;
    }
    setBusy(true);
    try {
      await deleteAccount({ password });
      // Primero se sale de Mi cuenta: si la sesión se vaciara antes, RequireAuth llevaría al
      // inicio de sesión.
      navigate('/', { replace: true, state: { notice: 'Tu cuenta se ha borrado' } });
      clearSession();
    } catch (err) {
      const message = err.fieldErrors?.password;
      setFieldError(message ?? null);
      if (!message) setGeneral(err.message);
      setBusy(false);
    }
  };

  return (
    <AccountSection
      title="Borrar la cuenta"
      danger
      description="Borra tu cuenta y tus datos personales de Bookia de forma definitiva."
    >
      <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
        {CONSEQUENCES.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
      >
        Borrar mi cuenta
      </button>
      <ConfirmDialog
        open={open}
        title="¿Borrar tu cuenta?"
        tone="danger"
        confirmLabel="Borrar la cuenta"
        busy={busy}
        onConfirm={confirm}
        onCancel={close}
      >
        <p>
          Se cancelarán tus reservas activas y se borrarán tus favoritos y tus datos personales. No
          se puede deshacer.
        </p>
        <FormField
          label="Tu contraseña"
          name="delete-password"
          type="password"
          autoComplete="current-password"
          revealable
          maxLength={200}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') confirm();
          }}
          error={fieldError}
        />
        {general && (
          <p role="alert" className="font-medium text-red-700">
            {general}
          </p>
        )}
      </ConfirmDialog>
    </AccountSection>
  );
}
