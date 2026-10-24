// Campo de formulario con etiqueta, ayuda y error asociados para lectores de pantalla.
import { useId } from 'react';

const INPUT_BASE =
  'block w-full rounded-md border bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1';

/**
 * @param {{label: string, name: string, error?: string, hint?: string, as?: 'input'|'textarea'|'select',
 *   children?: React.ReactNode} & Record<string, unknown>} props
 *   El resto de props (type, value, onChange, required…) pasa al control.
 */
export function FormField({ label, name, error, hint, as: Control = 'input', children, ...rest }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const tone = error
    ? 'border-red-500 focus-visible:outline-red-600'
    : 'border-stone-300 focus-visible:outline-primary-700';

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
      <Control
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT_BASE} ${tone}`}
        {...rest}
      >
        {children}
      </Control>
      {hint && (
        <p id={hintId} className="text-xs text-stone-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
