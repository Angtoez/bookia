// Campo de formulario con etiqueta, ayuda y error asociados para lectores de pantalla.
import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './AuthIcons.jsx';

const INPUT_BASE =
  'block w-full rounded-md border bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1';

/**
 * @param {{label: string, name: string, error?: string, hint?: React.ReactNode,
 *   icon?: React.ReactNode, revealable?: boolean, as?: 'input'|'textarea'|'select',
 *   children?: React.ReactNode} & Record<string, unknown>} props
 *   `icon` se pinta dentro del control, a la izquierda. `revealable` añade a un campo de
 *   contraseña un botón para mostrarla. El resto de props (type, value, onChange, required…)
 *   pasa al control.
 */
export function FormField({
  label,
  name,
  error,
  hint,
  icon,
  revealable = false,
  as: Control = 'input',
  children,
  ...rest
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const tone = error
    ? 'border-red-500 focus-visible:outline-red-600'
    : 'border-stone-300 focus-visible:outline-primary-700';
  const padding = `${icon ? 'pl-10' : ''} ${revealable ? 'pr-11' : ''}`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
        {rest.required && (
          <span aria-hidden="true" className="text-red-700">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
            {icon}
          </span>
        )}
        <Control
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_BASE} ${tone} ${padding}`}
          {...rest}
          type={revealable && revealed ? 'text' : rest.type}
        >
          {children}
        </Control>
        {revealable && (
          <button
            type="button"
            aria-pressed={revealed}
            onClick={() => setRevealed(!revealed)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-stone-500 hover:text-stone-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-700"
          >
            {/* Texto oculto y no aria-label, para que la etiqueta del campo siga siendo única. */}
            <span className="sr-only">Mostrar contraseña</span>
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hint && (
        <div id={hintId} className="text-xs text-stone-600">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
