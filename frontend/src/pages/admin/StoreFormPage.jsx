// Alta y edición de puntos de venta (US3). En edición solo se envían los campos que cambian.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { createStore, getStore, updateStore } from '../../services/storesService.js';
import { changedFields } from '../../utils/formHelpers.js';
import {
  EMPTY_STORE_FORM,
  formToStoreInput,
  storeApiErrors,
  storeToForm,
  validateStoreForm,
} from '../../utils/storeForm.js';
import { NotFoundPage } from '../NotFoundPage.jsx';

const FIELD_ORDER = Object.keys(EMPTY_STORE_FORM);

export function StoreFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const fetchStore = useCallback(() => (id ? getStore(id) : Promise.resolve(null)), [id]);
  const { data: store, error: loadError, loading, reload } = useApiQuery(fetchStore);

  const [form, setForm] = useState(EMPTY_STORE_FORM);
  const [loadedId, setLoadedId] = useState(null);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (store && !loading && loadedId !== store.id) {
    setLoadedId(store.id);
    setForm(storeToForm(store));
  }

  useEffect(() => {
    document.title = `${isEdit ? 'Editar establecimiento' : 'Nuevo establecimiento'} · Administración · Bookia`;
  }, [isEdit]);

  if (isEdit) {
    if (loadError?.status === 404 || loadError?.status === 400) {
      return <NotFoundPage message="Este establecimiento no existe o se ha eliminado." />;
    }
    if (loadError) return <ErrorMessage error={loadError} onRetry={reload} />;
    if (loading || loadedId !== id) return <Spinner label="Cargando el establecimiento…" />;
  }

  const update = (event) => {
    const changed = { ...form, [event.target.name]: event.target.value };
    setForm(changed);
    if (attempted) setErrors(validateStoreForm(changed));
  };

  const focusFirstError = (fieldErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAttempted(true);
    setGeneralError(null);
    const clientErrors = validateStoreForm(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }
    const input = formToStoreInput(form);
    const changes = isEdit ? changedFields(input, formToStoreInput(storeToForm(store))) : input;
    if (isEdit && Object.keys(changes).length === 0) {
      navigate('/admin/stores', { state: { notice: 'No había cambios que guardar.' } });
      return;
    }
    setSubmitting(true);
    try {
      const saved = isEdit ? await updateStore(id, changes) : await createStore(input);
      const notice = isEdit
        ? `Se ha actualizado «${saved.name}».`
        : `Se ha creado «${saved.name}».`;
      navigate('/admin/stores', { state: { notice } });
    } catch (err) {
      const { fields, general } = storeApiErrors(err);
      setErrors(fields);
      setGeneralError(general);
      setSubmitting(false);
      focusFirstError(fields);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">
        {isEdit ? 'Editar establecimiento' : 'Nuevo establecimiento'}
      </h1>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage error={generalError} />
        <FormField
          label="Nombre"
          name="name"
          required
          maxLength={150}
          value={form.name}
          onChange={update}
          error={errors.name}
        />
        <FormField
          label="Dirección"
          name="address"
          required
          maxLength={300}
          autoComplete="street-address"
          value={form.address}
          onChange={update}
          error={errors.address}
        />
        <FormField
          label="Horario"
          name="opening_hours"
          required
          maxLength={300}
          hint="Por ejemplo: L–V 9:00–19:00; S 10:00–14:00"
          value={form.opening_hours}
          onChange={update}
          error={errors.opening_hours}
        />
        <FormField
          label="Teléfono"
          name="phone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          value={form.phone}
          onChange={update}
          error={errors.phone}
        />
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Link
            to="/admin/stores"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear establecimiento'}
          </button>
        </div>
      </form>
    </section>
  );
}
