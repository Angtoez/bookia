// Pruebas unitarias de la consulta de auditoría con la paginación mockeada (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/utils/pagination.js', () => ({ paginate: vi.fn() }));
vi.mock('../../../src/models/User.js', () => ({ User: { find: vi.fn() } }));

const { paginate } = await import('../../../src/utils/pagination.js');
const { User } = await import('../../../src/models/User.js');
const { listAuditLogs } = await import('../../../src/controllers/auditLogsController.js');

const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });
const log = (fields) => ({
  _id: 'l1',
  action: 'update',
  entity_type: 'book',
  entity_id: 'b1',
  entity_label: 'Libro',
  before: { title: 'A' },
  after: { title: 'B' },
  created_at: new Date('2026-10-01'),
  ...fields,
});

beforeEach(() => vi.clearAllMocks());

describe('listAuditLogs', () => {
  it('filtra por entity_type y ordena de la más reciente, sin populate', async () => {
    paginate.mockResolvedValue(page([]));
    await listAuditLogs(
      { validated: { query: { entity_type: 'store', page: 2 } } },
      { json: vi.fn() },
    );
    const [, filter, options] = paginate.mock.calls[0];
    expect(filter).toEqual({ entity_type: 'store' });
    expect(options).toMatchObject({ sort: { created_at: -1, _id: -1 }, page: 2 });
    expect(options.populate).toBeUndefined();
    // Sin autores en la página no hace falta buscar usuarios.
    expect(User.find).not.toHaveBeenCalled();
  });

  it('distingue al autor que existe, al sistema y a una cuenta borrada (feature 002)', async () => {
    paginate.mockResolvedValue(
      page([
        log({ user_id: 'u1' }),
        log({ _id: 'l2', user_id: null }),
        log({ _id: 'l3', user_id: 'u-borrado' }),
        log({ _id: 'l4', user_id: 'u1' }),
      ]),
    );
    User.find.mockResolvedValue([{ _id: 'u1', name: 'Ana' }]);
    const res = { json: vi.fn() };
    await listAuditLogs({ validated: { query: {} } }, res);
    expect(paginate.mock.calls[0][1]).toEqual({});
    // Una sola consulta con los autores distintos de la página.
    expect(User.find).toHaveBeenCalledTimes(1);
    const { items } = res.json.mock.calls[0][0];
    expect(items[0]).toMatchObject({ user: { id: 'u1', name: 'Ana' }, user_deleted: false });
    expect(items[1]).toMatchObject({ user: null, user_deleted: false });
    expect(items[2]).toMatchObject({ user: null, user_deleted: true });
    expect(items[0]).toMatchObject({ id: 'l1', entity_id: 'b1', before: { title: 'A' } });
  });
});
