import { describe, expect, it } from 'vitest';
import {
  cancelReasonLabel,
  isActiveReservation,
  reservationStatusLabel,
} from '../../src/utils/reservationStatusLabel.js';

describe('reservationStatusLabel', () => {
  it('traduce cada estado', () => {
    expect(reservationStatusLabel('pending')).toBe('Pendiente');
    expect(reservationStatusLabel('ready')).toBe('Lista para recoger');
    expect(reservationStatusLabel('picked_up')).toBe('Recogida');
    expect(reservationStatusLabel('cancelled')).toBe('Cancelada');
    expect(reservationStatusLabel('expired')).toBe('Caducada');
    expect(reservationStatusLabel('otro')).toBe('otro');
  });

  it('los motivos dependen de quién los lee', () => {
    expect(cancelReasonLabel('user')).toBe('por ti');
    expect(cancelReasonLabel('user', 'admin')).toBe('por el usuario');
    expect(cancelReasonLabel('admin')).toBe('por la administración');
    expect(cancelReasonLabel('book_deleted')).toBe('libro retirado');
    expect(cancelReasonLabel('store_deleted')).toBe('establecimiento cerrado');
    expect(cancelReasonLabel('account_deactivated')).toBe('cuenta desactivada');
    expect(cancelReasonLabel(null)).toBeNull();
  });

  it('activas: pendiente y lista para recoger', () => {
    expect(isActiveReservation({ status: 'pending' })).toBe(true);
    expect(isActiveReservation({ status: 'ready' })).toBe(true);
    expect(isActiveReservation({ status: 'expired' })).toBe(false);
  });
});
