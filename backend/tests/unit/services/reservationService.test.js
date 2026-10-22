// Servicio de reservas: tabla de transiciones (pura) y caducidad contra la base de datos en memoria.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditLog } from '../../../src/models/AuditLog.js';
import { RESERVATION_STATUSES, Reservation } from '../../../src/models/Reservation.js';
import { StoreBook } from '../../../src/models/StoreBook.js';
import { User } from '../../../src/models/User.js';
import {
  createReservation,
  toPublic,
  transition,
} from '../../../src/services/reservationService.js';
import { canTransition, expireOverdue } from '../../../src/services/reservationTransitions.js';
import { runInTransaction } from '../../../src/services/transaction.js';
import { clearDb, startDb, stopDb } from '../../helpers/db.js';
import {
  createAdmin,
  createBook,
  createStore,
  createStoreBook,
  createUser,
} from '../../helpers/factories.js';

const PAST = () => new Date(Date.now() - 1000);

async function setup(stock = 1) {
  const book = await createBook();
  const store = await createStore();
  await createStoreBook({ book_id: book._id, store_id: store._id, stock });
  return { book, store, bookId: book._id, storeId: store._id };
}

const makeOverdue = (id) => Reservation.updateOne({ _id: id }, { expires_at: PAST() });

describe('tabla de transiciones', () => {
  const valid = [
    ['pending', 'ready'],
    ['ready', 'picked_up'],
    ['pending', 'cancelled'],
    ['ready', 'cancelled'],
    ['pending', 'expired'],
    ['ready', 'expired'],
  ];
  const all = RESERVATION_STATUSES.flatMap((from) => RESERVATION_STATUSES.map((to) => [from, to]));

  it.each(all)('%s → %s', (from, to) => {
    const expected = valid.some(([f, t]) => f === from && t === to);
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe('caducidad al tocar los datos', () => {
  beforeAll(startDb);
  afterAll(stopDb);
  beforeEach(clearDb);

  it('expireOverdue caduca solo las vencidas que cumplen el filtro', async () => {
    const user = await createUser();
    const a = await setup(2);
    const b = await setup(2);
    const r1 = await createReservation({ user, ...a });
    const r2 = await createReservation({ user, ...b });
    const r3 = await createReservation({ user: await createUser(), ...a });
    await makeOverdue(r1._id);
    await makeOverdue(r2._id);

    const n = await runInTransaction((s) => expireOverdue({ store_id: a.storeId }, s));
    expect(n).toBe(1);
    const statuses = await Promise.all(
      [r1, r2, r3].map(async (r) => (await Reservation.findById(r._id)).status),
    );
    expect(statuses).toEqual(['expired', 'pending', 'pending']);
    expect((await StoreBook.findOne({ store_id: a.storeId })).reserved_count).toBe(1);
    expect((await User.findById(user._id)).active_reservations).toBe(1);
  });

  it('reservar una unidad ocupada por una reserva vencida funciona', async () => {
    const ids = await setup(1);
    const first = await createReservation({ user: await createUser(), ...ids });
    await makeOverdue(first._id);
    const second = await createReservation({ user: await createUser(), ...ids });
    expect(second.status).toBe('pending');
    expect((await Reservation.findById(first._id)).status).toBe('expired');
    expect((await StoreBook.findOne({ book_id: ids.bookId })).reserved_count).toBe(1);
  });

  it('una reserva vencida no cuenta para el límite de 5', async () => {
    const user = await createUser();
    const created = [];
    for (let i = 0; i < 5; i += 1)
      created.push(await createReservation({ user, ...(await setup()) }));
    await makeOverdue(created[0]._id);
    const sixth = await createReservation({ user, ...(await setup()) });
    expect(sixth.status).toBe('pending');
    expect((await User.findById(user._id)).active_reservations).toBe(5);
  });

  it('cancelar una reserva vencida responde 409 y la deja caducada', async () => {
    const user = await createUser();
    const ids = await setup();
    const r = await createReservation({ user, ...ids });
    await makeOverdue(r._id);
    await expect(transition(r._id, 'cancelled', { actor: user })).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
      message: 'La reserva ha caducado',
    });
    expect((await Reservation.findById(r._id)).status).toBe('expired');
    expect((await StoreBook.findOne({ book_id: ids.bookId })).reserved_count).toBe(0);
    const log = await AuditLog.findOne({ entity_type: 'reservation' });
    expect(log).toMatchObject({ user_id: null, action: 'status_change' });
  });

  it('expired solo se aplica a reservas vencidas', async () => {
    const r = await createReservation({ user: await createUser(), ...(await setup()) });
    await expect(transition(r._id, 'expired')).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('toPublic no cambia el estado ni expone campos internos', async () => {
    const admin = await createAdmin();
    const r = await createReservation({ user: admin, ...(await setup()) });
    const pub = toPublic(r);
    expect(Object.keys(pub).sort()).toEqual(
      [
        'book_id',
        'book_title',
        'cancel_reason',
        'closed_at',
        'created_at',
        'expires_at',
        'id',
        'price_cents',
        'ready_at',
        'status',
        'store_address',
        'store_id',
        'store_name',
      ].sort(),
    );
    expect(pub.id).toBe(String(r._id));
  });
});
