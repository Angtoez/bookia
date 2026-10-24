// Inventario de un punto de venta: stock y precio propio en línea, alta y baja de libros (US3).
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AddStoreBookForm } from '../../components/AddStoreBookForm.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { Notice } from '../../components/Notice.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { StoreBookRow } from '../../components/StoreBookRow.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useConfig } from '../../hooks/useConfig.js';
import {
  addStoreBook,
  getStore,
  listStoreBooks,
  removeStoreBook,
  updateStoreBook,
} from '../../services/storesService.js';
import { NotFoundPage } from '../NotFoundPage.jsx';

export function StoreInventoryPage() {
  const { id } = useParams();
  const config = useConfig();
  const fetchStore = useCallback(() => getStore(id), [id]);
  const { data: store, error: storeError, reload: reloadStore } = useApiQuery(fetchStore);
  const fetchPage = useCallback(({ page }) => listStoreBooks(id, { page }), [id]);
  const { page, data, error, loading, reload, setPage } = useAdminList(fetchPage);

  const [notice, setNotice] = useState(null);
  const [adding, setAdding] = useState(false);
  // {item, busy?, error?}: el libro que se va a quitar del inventario.
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (store) document.title = `Inventario de ${store.name} · Administración · Bookia`;
  }, [store]);

  if (storeError?.status === 404 || storeError?.status === 400) {
    return <NotFoundPage message="Este establecimiento no existe o se ha eliminado." />;
  }
  if (storeError) return <ErrorMessage error={storeError} onRetry={reloadStore} />;

  const currency = config?.currency;

  const handleSave = async (item, changes) => {
    setNotice(null);
    await updateStoreBook(id, item.book_id, changes);
    setNotice(`Se ha actualizado «${item.title}».`);
    reload();
  };

  const handleAdd = async (input) => {
    setNotice(null);
    const added = await addStoreBook(id, input);
    setAdding(false);
    setNotice(`Se ha añadido «${added.title}» al inventario.`);
    reload();
  };

  const confirmRemove = async () => {
    const { item } = removing;
    setRemoving({ item, busy: true });
    try {
      await removeStoreBook(id, item.book_id);
      setRemoving(null);
      setNotice(`Se ha quitado «${item.title}» del inventario.`);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      // 409 HAS_ACTIVE_RESERVATIONS: se explica en el propio diálogo.
      setRemoving({ item, error: err });
    }
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando el inventario…" />;
  else if (data.items.length === 0) {
    content = (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        Este establecimiento todavía no tiene libros.
      </p>
    );
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-busy={loading} className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">Inventario de {store?.name}</caption>
            <thead className="bg-stone-100 text-xs tracking-wide text-stone-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  Libro
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Reservadas
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Disponibles
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Precio en tienda
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Precio final
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-200 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((item) => (
                <StoreBookRow
                  key={item.book_id}
                  item={item}
                  currency={currency}
                  onSave={handleSave}
                  onRemove={(target) => {
                    setNotice(null);
                    setRemoving({ item: target });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-600">
          Deja vacío el precio en tienda para usar el precio de referencia del libro.
        </p>
        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <Link
        to="/admin/stores"
        className="inline-block rounded-sm text-sm font-medium text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
      >
        ← Volver a establecimientos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Inventario{store ? ` de ${store.name}` : ''}
          </h1>
          {store && <p className="text-sm text-stone-600">{store.address}</p>}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setAdding(true);
            }}
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            Añadir libro
          </button>
        )}
      </div>
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      {adding && (
        <AddStoreBookForm
          currency={currency}
          excludedIds={new Set(data?.items.map((item) => item.book_id))}
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {content}

      <ConfirmDialog
        open={Boolean(removing)}
        title={removing ? `¿Quitar «${removing.item.title}» del inventario?` : ''}
        confirmLabel="Quitar"
        tone="danger"
        busy={Boolean(removing?.busy)}
        // Con reservas activas, reintentar daría el mismo 409.
        confirmDisabled={removing?.error?.code === 'HAS_ACTIVE_RESERVATIONS'}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      >
        <p>El libro seguirá en el catálogo, pero dejará de aparecer en este establecimiento.</p>
        <ErrorMessage error={removing?.error} />
      </ConfirmDialog>
    </section>
  );
}
