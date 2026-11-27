// Registro de cuentas (US4): valida en el cliente con las reglas de la API y muestra por campo
// los errores que devuelva el servidor. Tras registrarse, la sesión queda iniciada.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { LockIcon, MailIcon, UserIcon } from '../components/AuthIcons.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { FormField } from '../components/FormField.jsx';
import { ConfirmHint, PasswordChecklist } from '../components/PasswordHints.jsx';
import { ButtonSpinner } from '../components/Spinner.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { PASSWORD_POLICY_MESSAGE, meetsPasswordPolicy } from '../utils/passwordPolicy.js';
import { safeNext } from '../utils/safeNext.js';

const FIELDS = ['name', 'email', 'password', 'confirm'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Portadas del panel: libros del catálogo de demostración (solo se usa el ISBN).
const COVERS = ['9788416998722', '9788439720713', '9788498381498'];

export function validateRegistration({ name, email, password, confirm }) {
  const errors = {};
  if (!name.trim()) errors.name = 'El nombre es obligatorio';
  else if (name.trim().length > 100) errors.name = 'El nombre admite como máximo 100 caracteres';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'El correo no es válido';
  if (!meetsPasswordPolicy(password)) errors.password = PASSWORD_POLICY_MESSAGE;
  if (confirm !== password) errors.confirm = 'Las contraseñas no coinciden';
  return errors;
}

/** Convierte un ApiError en errores por campo y, si no encaja en ninguno, en un error general. */
function fromApiError(error) {
  if (error.code === 'EMAIL_TAKEN') return { fields: { email: error.message }, general: null };
  const fields = error.fieldErrors ?? {};
  return { fields, general: Object.keys(fields).length > 0 ? null : error };
}

export function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const next = safeNext(rawNext);
  const formRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Crear cuenta · Bookia';
  }, []);

  if (status === 'authenticated' && !submitting) return <Navigate to={next} replace />;

  const update = (event) => {
    const changed = { ...form, [event.target.name]: event.target.value };
    setForm(changed);
    // Tras el primer intento, los errores se corrigen mientras se escribe.
    if (attempted) setErrors(validateRegistration(changed));
  };

  const focusFirstError = (fieldErrors) => {
    const first = FIELDS.find((field) => fieldErrors[field]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAttempted(true);
    setGeneralError(null);
    const clientErrors = validateRegistration(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate(next, { replace: true });
    } catch (err) {
      const { fields, general } = fromApiError(err);
      setErrors(fields);
      setGeneralError(general);
      setSubmitting(false);
      focusFirstError(fields);
    }
  };

  const loginHref = rawNext ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Únete a Bookia y reserva en tu librería."
      panelTitle="Tu próxima lectura te espera"
      panelText="Más de 80 cómics y mangas y cientos de libros en las librerías de Huauchinango."
      covers={COVERS}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage error={generalError} />
        <FormField
          label="Nombre"
          name="name"
          autoComplete="name"
          maxLength={100}
          required
          icon={<UserIcon />}
          value={form.name}
          onChange={update}
          error={errors.name}
        />
        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          icon={<MailIcon />}
          value={form.email}
          onChange={update}
          error={errors.email}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          revealable
          icon={<LockIcon />}
          hint={<PasswordChecklist password={form.password} />}
          value={form.password}
          onChange={update}
          error={errors.password}
        />
        <FormField
          label="Repite la contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          revealable
          icon={<LockIcon />}
          hint={
            form.confirm && !errors.confirm ? (
              <ConfirmHint password={form.password} confirm={form.confirm} />
            ) : null
          }
          value={form.confirm}
          onChange={update}
          error={errors.confirm}
        />
        {/* Información en el momento de recoger los datos (GDPR y normativa local). El enlace abre
            otra pestaña para no perder lo escrito en el formulario. */}
        <p className="text-xs text-stone-600">
          Usaremos tu nombre y tu correo para gestionar tu cuenta, tus reservas y tus favoritos. Más
          información en la{' '}
          <Link
            to="/privacidad"
            target="_blank"
            rel="noopener"
            className="font-medium text-primary-800 underline underline-offset-2"
          >
            política de privacidad
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 py-2.5 font-medium text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:opacity-60"
        >
          {submitting && <ButtonSpinner />}
          {submitting ? 'Creando la cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="border-t border-stone-200 pt-6 text-center text-sm text-stone-700">
        ¿Ya tienes cuenta?{' '}
        <Link to={loginHref} className="font-medium text-primary-800 underline underline-offset-2">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
