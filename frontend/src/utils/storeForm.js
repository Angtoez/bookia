// Formulario de punto de venta, con las reglas de backend/src/validators/storeValidators.js.
import { apiFieldErrors, requiredError } from './formHelpers.js';

export const EMPTY_STORE_FORM = { name: '', address: '', opening_hours: '', phone: '' };
const FORM_FIELDS = Object.keys(EMPTY_STORE_FORM);
const PHONE_PATTERN = /^[0-9 +\-()]{1,30}$/;

export function storeToForm(store) {
  return {
    name: store.name ?? '',
    address: store.address ?? '',
    opening_hours: store.opening_hours ?? '',
    phone: store.phone ?? '',
  };
}

/** Datos para la API; un teléfono vacío se envía como null. */
export function formToStoreInput(form) {
  const phone = form.phone.trim();
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    opening_hours: form.opening_hours.trim(),
    phone: phone || null,
  };
}

export function validateStoreForm(form) {
  const errors = {};
  const checks = [
    ['name', requiredError(form.name, 150, 'El nombre')],
    ['address', requiredError(form.address, 300, 'La dirección', 'La dirección es obligatoria')],
    ['opening_hours', requiredError(form.opening_hours, 300, 'El horario')],
  ];
  for (const [field, error] of checks) if (error) errors[field] = error;
  const phone = form.phone.trim();
  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'El teléfono solo admite dígitos, espacios, +, - y ()';
  }
  return errors;
}

export const storeApiErrors = (error) => apiFieldErrors(error, FORM_FIELDS);
