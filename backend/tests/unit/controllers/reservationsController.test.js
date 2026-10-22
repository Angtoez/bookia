// Pruebas unitarias del controlador de reservas con el servicio mockeado (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/reservationService.js', () => ({
  createReservation: vi.fn(),
  listUserReservations: vi.fn(),
  listAllReservations: vi.fn(),
  transition: vi.fn(),
  toPublic: vi.fn((r) => ({ id: r._id, status: r.status })),
}));

const service = await import('../../../src/services/reservationService.js');
const controller = await import('../../../src/controllers/reservationsController.js');

const user = { _id: 'u1', role: 'user' };
const mockRes = () => {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

beforeEach(() => vi.clearAllMocks());

describe('reservationsController', () => {
  it('create pasa el usuario y los ids, y responde 201', async () => {
    service.createReservation.mockResolvedValue({ _id: 'r1', status: 'pending' });
    const res = mockRes();
    await controller.create({ user, validated: { body: { book_id: 'b1', store_id: 's1' } } }, res);
    expect(service.createReservation).toHaveBeenCalledWith({ user, bookId: 'b1', storeId: 's1' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'r1', status: 'pending' });
  });

  it('listMine filtra por el usuario de la sesión', async () => {
    service.listUserReservations.mockResolvedValue(page([{ _id: 'r1', status: 'ready' }]));
    const res = mockRes();
    await controller.listMine({ user, validated: { query: { status: 'ready' } } }, res);
    expect(service.listUserReservations).toHaveBeenCalledWith('u1', { status: 'ready' });
    expect(res.json.mock.calls[0][0].items).toEqual([{ id: 'r1', status: 'ready' }]);
  });

  it('listAll pasa los filtros de la query', async () => {
    service.listAllReservations.mockResolvedValue(page([]));
    const res = mockRes();
    const query = { status: 'pending', store_id: 's1' };
    await controller.listAll({ user, validated: { query } }, res);
    expect(service.listAllReservations).toHaveBeenCalledWith(query);
    expect(res.json).toHaveBeenCalledWith(page([]));
  });

  it.each([
    ['cancel', 'cancelled'],
    ['markReady', 'ready'],
    ['markPickedUp', 'picked_up'],
  ])('%s pide la transición a %s con el actor', async (handler, to) => {
    service.transition.mockResolvedValue({ _id: 'r1', status: to });
    const res = mockRes();
    await controller[handler]({ user, validated: { params: { id: 'r1' } } }, res);
    expect(service.transition).toHaveBeenCalledWith('r1', to, { actor: user });
    expect(res.json).toHaveBeenCalledWith({ id: 'r1', status: to });
  });

  it('propaga los errores del servicio', async () => {
    service.transition.mockRejectedValue(Object.assign(new Error('x'), { status: 403 }));
    await expect(
      controller.cancel({ user, validated: { params: { id: 'r1' } } }, mockRes()),
    ).rejects.toMatchObject({ status: 403 });
  });
});
