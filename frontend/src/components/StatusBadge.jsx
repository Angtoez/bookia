// Etiqueta del estado de una reserva: el texto siempre acompaña al color.
import { reservationStatusLabel } from '../utils/reservationStatusLabel.js';

const TONES = {
  pending: 'bg-amber-100 text-amber-900',
  ready: 'bg-sky-100 text-sky-900',
  picked_up: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-red-100 text-red-900',
  expired: 'bg-stone-200 text-stone-800',
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        TONES[status] ?? 'bg-stone-200 text-stone-800'
      }`}
    >
      {reservationStatusLabel(status)}
    </span>
  );
}
