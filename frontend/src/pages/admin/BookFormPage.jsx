// Alta y edición de libros (US2). En edición solo se envían los campos que cambian.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useConfig } from '../../hooks/useConfig.js';
import { createBook, getBook, updateBook } from '../../services/booksService.js';
import { listGenres } from '../../services/configService.js';
import {
  EMPTY_BOOK_FORM,
  bookApiErrors,
  bookToForm,
  changedFields,
  formToInput,
  validateBookForm,
} from '../../utils/bookForm.js';
import { NotFoundPage } from '../NotFoundPage.jsx';

const FIELD_ORDER = Object.keys(EMPTY_BOOK_FORM);

export function BookFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const config = useConfig();
  const formRef = useRef(null);

  const fetchBook = useCallback(() => (id ? getBook(id) : Promise.resolve(null)), [id]);
  const { data: book, error: loadError, loading, reload } = useApiQuery(fetchBook);
  const { data: genres } = useApiQuery(listGenres);

  const [form, setForm] = useState(EMPTY_BOOK_FORM);
  const [loadedId, setLoadedId] = useState(null);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Al cargar el libro (o cambiar de libro), el formulario toma sus valores.
  if (book && !loading && loadedId !== book.id) {
    setLoadedId(book.id);
    setForm(bookToForm(book));
  }

  useEffect(() => {
    document.title = `${isEdit ? 'Editar libro' : 'Nuevo libro'} · Administración · Bookia`;
  }, [isEdit]);

  if (isEdit) {
    if (loadError?.status === 404 || loadError?.status === 400) {
      return <NotFoundPage message="Este libro no existe o se ha eliminado." />;
    }
    if (loadError) return <ErrorMessage error={loadError} onRetry={reload} />;
    if (loading || loadedId !== id) return <Spinner label="Cargando el libro…" />;
  }

  const update = (event) => {
    const changed = { ...form, [event.target.name]: event.target.value };
    setForm(changed);
    if (attempted) setErrors(validateBookForm(changed));
  };

  const focusFirstError = (fieldErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAttempted(true);
    setGeneralError(null);
    const clientErrors = validateBookForm(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }
    const input = formToInput(form);
    const changes = isEdit ? changedFields(input, formToInput(bookToForm(book))) : input;
    if (isEdit && Object.keys(changes).length === 0) {
      navigate('/admin/books', { state: { notice: 'No había cambios que guardar.' } });
      return;
    }
    setSubmitting(true);
    try {
      const saved = isEdit ? await updateBook(id, changes) : await createBook(input);
      const notice = isEdit
        ? `Se ha actualizado «${saved.title}».`
        : `Se ha creado «${saved.title}».`;
      navigate('/admin/books', { state: { notice } });
    } catch (err) {
      const { fields, general } = bookApiErrors(err);
      setErrors(fields);
      setGeneralError(general);
      setSubmitting(false);
      focusFirstError(fields);
    }
  };

  const currency = config?.currency;
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">
        {isEdit ? 'Editar libro' : 'Nuevo libro'}
      </h1>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        <ErrorMessage error={generalError} />
        <FormField
          label="Título"
          name="title"
          required
          maxLength={300}
          value={form.title}
          onChange={update}
          error={errors.title}
        />
        <FormField
          label="Autor"
          name="author"
          required
          maxLength={200}
          value={form.author}
          onChange={update}
          error={errors.author}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            as="select"
            label="Género"
            name="genre_id"
            required
            value={form.genre_id}
            onChange={update}
            error={errors.genre_id}
          >
            <option value="">Elige un género</option>
            {(genres ?? []).map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </FormField>
          <FormField
            label="ISBN"
            name="isbn"
            required
            maxLength={20}
            hint="ISBN-10 o ISBN-13; se admiten guiones."
            value={form.isbn}
            onChange={update}
            error={errors.isbn}
          />
          <FormField
            label={currency ? `Precio de referencia (${currency})` : 'Precio de referencia'}
            name="price"
            required
            inputMode="decimal"
            hint="Por ejemplo: 18,50"
            value={form.price}
            onChange={update}
            error={errors.price}
          />
          <FormField
            label="Año de publicación"
            name="publication_year"
            inputMode="numeric"
            maxLength={4}
            value={form.publication_year}
            onChange={update}
            error={errors.publication_year}
          />
        </div>
        <FormField
          label="Editorial"
          name="publisher"
          maxLength={200}
          value={form.publisher}
          onChange={update}
          error={errors.publisher}
        />
        <FormField
          as="textarea"
          label="Descripción"
          name="description"
          rows={5}
          maxLength={5000}
          value={form.description}
          onChange={update}
          error={errors.description}
        />
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Link
            to="/admin/books"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear libro'}
          </button>
        </div>
      </form>
    </section>
  );
}
