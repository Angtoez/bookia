// Inicio de sesión con correo y contraseña; vuelve a `next` o al catálogo.
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { LockIcon, MailIcon } from '../components/AuthIcons.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { FormField } from '../components/FormField.jsx';
import { ButtonSpinner } from '../components/Spinner.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { safeNext } from '../utils/safeNext.js';

// Portadas del panel: libros del catálogo de demostración (solo se usa el ISBN).
const COVERS = ['9789877254112', '9789681902551', '9788408053040'];

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Iniciar sesión · Bookia';
  }, []);

  if (status === 'authenticated' && !submitting) return <Navigate to={next} replace />;

  const fieldErrors = error?.fieldErrors ?? {};
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form.email.trim(), form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Entra para reservar libros y ver tus favoritos."
      panelTitle="Apártalo hoy, recógelo en tu librería"
      panelText="Busca un libro, mira en qué librería está disponible y resérvalo sin prisas."
      covers={COVERS}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage error={error && !error.details?.length ? error : null} />
        {error?.code === 'INVALID_CREDENTIALS' && (
          // La API no dice si la cuenta está bloqueada (FR-003): se avisa de la regla a cualquiera
          // que falle. Los valores repiten MAX_FAILED_LOGINS y LOCK_DURATION_MS del backend (FR-004).
          <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            Por seguridad, tras 5 intentos fallidos seguidos la cuenta se bloquea durante 15
            minutos. Si te ocurre, espera ese tiempo y vuelve a intentarlo.
          </p>
        )}
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
          error={fieldErrors.email}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          revealable
          icon={<LockIcon />}
          value={form.password}
          onChange={update}
          error={fieldErrors.password}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 py-2.5 font-medium text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:opacity-60"
        >
          {submitting && <ButtonSpinner />}
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="border-t border-stone-200 pt-6 text-center text-sm text-stone-700">
        ¿No tienes cuenta?{' '}
        <Link
          to={searchParams.get('next') ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-primary-800 underline underline-offset-2"
        >
          Crea una
        </Link>
      </p>
    </AuthLayout>
  );
}
