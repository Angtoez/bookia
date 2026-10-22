// Consulta de la auditoría: quién hizo qué y cuándo, con el detalle de cada cambio (US7, FR-026 a
// FR-028). Solo lectura.
import { Fragment, useCallback, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { listAuditLogs } from '../../services/auditLogsService.js';
import {
  ENTITY_TYPES,
  auditActionLabel,
  auditChanges,
  entityTypeLabel,
  formatAuditValue,
} from '../../utils/auditLabels.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { applyParamChanges, readPage } from '../../utils/searchParams.js';

function ChangeList({ log }) {
  const changes = auditChanges(log.before, log.after);
  if (changes.length === 0) return <p className="text-stone-600">Sin cambios en los campos.</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
      {changes.map(({ field, before, after }) => (
        <Fragment key={field}>
          <dt className="font-mono text-xs text-stone-600">{field}</dt>
          <dd className="break-words text-stone-900">
            {log.before && (
              <span className="text-red-800 line-through">{formatAuditValue(before)}</span>
            )}
            {log.before && log.after && <span aria-hidden="true"> → </span>}
            {log.before && log.after && <span className="sr-only"> pasa a </span>}
            {log.after && <span className="text-emerald-800">{formatAuditValue(after)}</span>}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('entity_type') ?? '';
  const entityType = ENTITY_TYPES.includes(raw) ? raw : '';
  const page = readPage(searchParams.get('page'));
  const filterId = useId();
  const [expanded, setExpanded] = useState(() => new Set());

  const fetcher = useCallback(
    () => listAuditLogs({ entity_type: entityType || undefined, page }),
    [entityType, page],
  );
  const { data, error, loading, reload } = useApiQuery(fetcher);
  const setParams = (changes) => setSearchParams((prev) => applyParamChanges(prev, changes));

  useEffect(() => {
    document.title = 'Auditoría · Administración · Bookia';
  }, []);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando la auditoría…" />;
  else if (data.items.length === 0) {
    content = (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        No hay entradas de auditoría con este filtro.
      </p>
    );
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-busy={loading} className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Entradas de auditoría</caption>
            <thead className="bg-stone-100 text-xs tracking-wide text-stone-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Fecha y hora
                </th>
                <th scope="col" className="px-4 py-3">
                  Usuario
                </th>
                <th scope="col" className="px-4 py-3">
                  Acción
                </th>
                <th scope="col" className="px-4 py-3">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3">
                  Elemento
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-200 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((log) => {
                const open = expanded.has(log.id);
                const detailId = `audit-${log.id}`;
                return (
                  <Fragment key={log.id}>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-stone-900">
                        {log.user ? (
                          log.user.name
                        ) : (
                          <span className="text-stone-500 italic">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-700">{auditActionLabel(log.action)}</td>
                      <td className="px-4 py-3 text-stone-700">
                        {entityTypeLabel(log.entity_type)}
                      </td>
                      <th scope="row" className="px-4 py-3 font-medium text-stone-900">
                        {log.entity_label || '—'}
                      </th>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggle(log.id)}
                          aria-expanded={open}
                          aria-controls={detailId}
                          aria-label={`${open ? 'Ocultar' : 'Ver'} cambios: ${auditActionLabel(log.action)} de «${log.entity_label}»`}
                          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                        >
                          {open ? 'Ocultar' : 'Ver cambios'}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr id={detailId} className="bg-stone-50">
                        <td colSpan={6} className="px-4 py-3">
                          <ChangeList log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          onPageChange={(p) => setParams({ page: p })}
        />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Auditoría</h1>
          <p className="text-sm text-stone-600">Las entradas no se pueden modificar ni borrar.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor={filterId} className="block text-sm font-medium text-stone-800">
            Tipo
          </label>
          <select
            id={filterId}
            value={entityType}
            onChange={(event) => setParams({ entity_type: event.target.value })}
            className="block rounded-md border border-stone-300 bg-white px-3 py-2 text-base shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
          >
            <option value="">Todos</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {entityTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {content}
    </section>
  );
}
