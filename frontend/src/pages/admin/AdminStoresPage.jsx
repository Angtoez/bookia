// Gestión de puntos de venta: listado, alta, edición, inventario y baja (US3).
import { useEffect } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { Notice } from '../../components/Notice.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useNotice } from '../../hooks/useNotice.js';
import { deleteStore, getStoreDeletionImpact, listStores } from '../../services/storesService.js';
import { plural } from '../../utils/plural.js';

const ACTION =
  'rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60';
const NEUTRAL = `${ACTION} border-stone-300 text-stone-800 hover:bg-stone-100 focus-visible:outline-teal-700`;

/** Lo que se pierde al borrar una tienda; los libros siguen en el catálogo (FR-021). */
function ImpactSummary({ impact }) {
  const lines = [
    impact.books > 0
      ? `Se quitarán ${plural(impact.books, 'libro')} de su inventario; los libros seguirán en el catálogo.`
      : 'No tiene libros en su inventario.',
  ];
  if (impact.active_reservations > 0) {
    const verb = impact.active_reservations === 1 ? 'Se cancelará' : 'Se cancelarán';
    lines.push(
      `${verb} ${plural(impact.active_reservations, 'reserva activa', 'reservas activas')}.`,
    );
  }
  return (
    <ul className="list-disc space-y-1 pl-5">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

export function AdminStoresPage() {
  const { page, data, error, loading, reload, setPage } = useAdminList(listStores);
  const [notice, setNotice] = useNotice();
  const { pending, ask, dialogProps } = useConfirmDelete({
    getImpact: (store) => getStoreDeletionImpact(store.id),
    remove: (store) => deleteStore(store.id),
    onDeleted: (store) => {
      setNotice(`Se ha eliminado «${store.name}».`);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    },
  });

  useEffect(() => {
    document.title = 'Establecimientos · Administración · Bookia';
  }, []);

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando los establecimientos…" />;
  else if (data.items.length === 0) {
    content = (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        Todavía no hay establecimientos.
      </p>
    );
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-busy={loading} className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Establecimientos</caption>
            <thead className="bg-stone-100 text-xs tracking-wide text-stone-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Dirección
                </th>
                <th scope="col" className="px-4 py-3">
                  Horario
                </th>
                <th scope="col" className="px-4 py-3">
                  Teléfono
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-200 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((store) => (
                <tr key={store.id}>
                  <th scope="row" className="px-4 py-3 font-medium text-stone-900">
                    {store.name}
                  </th>
                  <td className="px-4 py-3 text-stone-700">{store.address}</td>
                  <td className="px-4 py-3 text-stone-700">{store.opening_hours}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                    {store.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/stores/${store.id}/books`}
                        aria-label={`Inventario de «${store.name}»`}
                        className={NEUTRAL}
                      >
                        Inventario
                      </Link>
                      <Link
                        to={`/admin/stores/${store.id}/edit`}
                        aria-label={`Editar «${store.name}»`}
                        className={NEUTRAL}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          ask(store);
                        }}
                        disabled={pending?.item.id === store.id}
                        aria-label={`Eliminar «${store.name}»`}
                        className={`${ACTION} border-red-300 text-red-800 hover:bg-red-50 focus-visible:outline-red-700`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Establecimientos</h1>
        <Link
          to="/admin/stores/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Nuevo establecimiento
        </Link>
      </div>
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      {content}

      <ConfirmDialog
        {...dialogProps}
        title={pending ? `¿Eliminar «${pending.item.name}»?` : ''}
        confirmLabel="Eliminar"
        tone="danger"
      >
        {pending?.impact && <ImpactSummary impact={pending.impact} />}
        {pending?.impact && <p>Esta acción no se puede deshacer.</p>}
        <ErrorMessage error={pending?.error} />
      </ConfirmDialog>
    </section>
  );
}
