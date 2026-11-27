// Gestión de cuentas: rol y estado, con confirmación y la regla del último administrador (US7).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { ErrorMessage } from '../../components/ErrorMessage.jsx';
import { Notice } from '../../components/Notice.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { SearchBar } from '../../components/SearchBar.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { useAuth } from '../../hooks/useAuth.js';
import { listUsers, updateUser } from '../../services/usersService.js';
import { ROLE_LABELS, USER_STATUS_LABELS } from '../../utils/auditLabels.js';
import { formatDateTime } from '../../utils/formatDate.js';

const ACTION =
  'rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60';

/** El cambio que propone cada botón, con los textos de su confirmación. */
function changeFor(user, kind) {
  if (kind === 'role') {
    const promote = user.role !== 'admin';
    return {
      changes: { role: promote ? 'admin' : 'user' },
      label: promote ? 'Hacer administrador' : 'Quitar administrador',
      question: promote
        ? `¿Dar el rol de administrador a ${user.name}?`
        : `¿Quitar el rol de administrador a ${user.name}?`,
      explain: promote
        ? 'Podrá gestionar el catálogo, los establecimientos, las reservas, los usuarios y la auditoría.'
        : 'Dejará de tener acceso a la administración en su siguiente acción.',
      done: promote
        ? `${user.name} ahora tiene el rol de administrador.`
        : `${user.name} ya no tiene el rol de administrador.`,
      danger: !promote,
    };
  }
  const disable = user.status === 'active';
  return {
    changes: { status: disable ? 'disabled' : 'active' },
    label: disable ? 'Desactivar' : 'Reactivar',
    question: disable
      ? `¿Desactivar la cuenta de ${user.name}?`
      : `¿Reactivar la cuenta de ${user.name}?`,
    explain: disable
      ? 'No podrá iniciar sesión, perderá el acceso en su siguiente acción y se cancelarán sus reservas activas.'
      : 'Podrá volver a iniciar sesión.',
    done: disable
      ? `Se ha desactivado la cuenta de ${user.name}.`
      : `Se ha reactivado la cuenta de ${user.name}.`,
    danger: disable,
  };
}

export function AdminUsersPage() {
  const { q, data, error, loading, reload, setQuery, setPage } = useAdminList(listUsers);
  const { user: me, setUser } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  // {user, kind: 'role'|'status', busy?, error?}: el cambio pendiente de confirmar.
  const [pending, setPending] = useState(null);

  useEffect(() => {
    document.title = 'Usuarios · Administración · Bookia';
  }, []);

  const proposal = pending && changeFor(pending.user, pending.kind);

  const confirm = async () => {
    const { user, kind } = pending;
    const { changes, done } = changeFor(user, kind);
    setPending({ user, kind, busy: true });
    try {
      const updated = await updateUser(user.id, changes);
      setPending(null);
      if (updated.id === me?.id) {
        // Cambio sobre la propia cuenta: la sesión de la SPA se actualiza ya.
        if (updated.status !== 'active') {
          setUser(null);
          navigate('/login', { replace: true });
          return;
        }
        setUser({ ...me, role: updated.role });
        if (updated.role !== 'admin') {
          navigate('/', { replace: true });
          return;
        }
      }
      setNotice(done);
      reload();
    } catch (err) {
      // 409 LAST_ADMIN: "Debe quedar al menos un administrador activo".
      setPending({ user, kind, error: err });
    }
  };

  const ask = (user, kind) => {
    setNotice(null);
    setPending({ user, kind });
  };

  let content;
  if (error) content = <ErrorMessage error={error} onRetry={reload} />;
  else if (!data) content = <Spinner label="Cargando los usuarios…" />;
  else if (data.items.length === 0) {
    content = (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
        No hay usuarios que coincidan con la búsqueda.
      </p>
    );
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-busy={loading} className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">Usuarios</caption>
            <thead className="bg-stone-100 text-xs tracking-wide text-stone-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Correo
                </th>
                <th scope="col" className="px-4 py-3">
                  Rol
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Alta
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-stone-200 ${loading ? 'opacity-60' : ''}`}>
              {data.items.map((user) => {
                const role = changeFor(user, 'role');
                const status = changeFor(user, 'status');
                return (
                  <tr key={user.id}>
                    <th scope="row" className="px-4 py-3 font-medium text-stone-900">
                      {user.name}
                      {user.id === me?.id && (
                        <span className="ml-1 text-xs text-stone-500">(tú)</span>
                      )}
                    </th>
                    <td className="px-4 py-3 text-stone-700">{user.email}</td>
                    <td className="px-4 py-3 text-stone-700">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        {USER_STATUS_LABELS[user.status] ?? user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                      {formatDateTime(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => ask(user, 'role')}
                          aria-label={`${role.label}: ${user.name}`}
                          className={`${ACTION} border-stone-300 text-stone-800 hover:bg-stone-100 focus-visible:outline-primary-700`}
                        >
                          {role.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => ask(user, 'status')}
                          aria-label={`${status.label}: ${user.name}`}
                          className={`${ACTION} ${
                            status.danger
                              ? 'border-red-300 text-red-800 hover:bg-red-50 focus-visible:outline-red-700'
                              : 'border-primary-700 text-primary-900 hover:bg-primary-50 focus-visible:outline-primary-700'
                          }`}
                        >
                          {status.label}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.total_pages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Usuarios</h1>
      <Notice message={notice} onDismiss={() => setNotice(null)} />
      <search>
        <SearchBar
          value={q}
          onChange={setQuery}
          label="Buscar por nombre o correo"
          placeholder="Por ejemplo: perez o @example.com"
        />
      </search>
      {content}

      <ConfirmDialog
        open={Boolean(pending)}
        title={proposal?.question ?? ''}
        confirmLabel={proposal?.label}
        cancelLabel="Volver"
        tone={proposal?.danger ? 'danger' : 'default'}
        busy={Boolean(pending?.busy)}
        // LAST_ADMIN no cambia al reintentar.
        confirmDisabled={Boolean(pending?.error)}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {proposal && <p>{proposal.explain}</p>}
        {pending?.user.id === me?.id && proposal && (
          <p className="font-medium">Es tu propia cuenta.</p>
        )}
        <ErrorMessage error={pending?.error} />
      </ConfirmDialog>
    </section>
  );
}
