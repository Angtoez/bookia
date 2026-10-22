// Inicio de sesión con correo y contraseña; vuelve a `next` o al catálogo.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage.jsx';
import { FormField } from '../components/FormField.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { safeNext } from '../utils/safeNext.js';

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
    <section className="mx-auto max-w-sm space-y-6 py-6">
      <h1 className="text-2xl font-bold text-stone-900">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage error={error && !error.details?.length ? error : null} />
        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          required
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
          value={form.password}
          onChange={update}
          error={fieldErrors.password}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </section>
  );
}
