// Baja con confirmación previa: consulta deletionImpact, abre el diálogo con lo que se perderá
// y solo permite confirmar si esa consulta ha funcionado (contracts/ui-routes.md § Bajas).
import { useState } from 'react';

/**
 * @template T
 * @param {{getImpact: (item: T) => Promise<object>, remove: (item: T) => Promise<unknown>,
 *   onDeleted: (item: T) => void}} actions
 * @returns {{pending: {item: T, impact?: object, error?: any, busy?: boolean}|null,
 *   ask: (item: T) => Promise<void>, dialogProps: object}}
 *   dialogProps se pasa tal cual a ConfirmDialog (open, busy, confirmDisabled, onConfirm, onCancel).
 */
export function useConfirmDelete({ getImpact, remove, onDeleted }) {
  const [pending, setPending] = useState(null);

  const ask = async (item) => {
    setPending({ item, busy: true });
    try {
      setPending({ item, impact: await getImpact(item) });
    } catch (error) {
      setPending({ item, error });
    }
  };

  const confirm = async () => {
    const current = pending;
    setPending({ ...current, busy: true, error: null });
    try {
      await remove(current.item);
      setPending(null);
      onDeleted(current.item);
    } catch (error) {
      setPending({ ...current, busy: false, error });
    }
  };

  return {
    pending,
    ask,
    dialogProps: {
      open: Boolean(pending && (pending.impact || pending.error)),
      busy: Boolean(pending?.busy),
      confirmDisabled: !pending?.impact,
      onConfirm: confirm,
      onCancel: () => setPending(null),
    },
  };
}
