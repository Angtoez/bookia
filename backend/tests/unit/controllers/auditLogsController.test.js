// Pruebas unitarias de la consulta de auditoría con la paginación mockeada (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/utils/pagination.js', () => ({ paginate: vi.fn() }));

const { paginate } = await import('../../../src/utils/pagination.js');
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
  it('filtra por entity_type, ordena de la más reciente y puebla el nombre del usuario', async () => {
    paginate.mockResolvedValue(page([]));
    await listAuditLogs(
      { validated: { query: { entity_type: 'store', page: 2 } } },
      { json: vi.fn() },
    );
    const [, filter, options] = paginate.mock.calls[0];
    expect(filter).toEqual({ entity_type: 'store' });
    expect(options).toMatchObject({
      sort: { created_at: -1, _id: -1 },
      populate: { path: 'user_id', select: 'name' },
      page: 2,
    });
  });

  it('sin filtro consulta todo; user es {id, name} o null', async () => {
    paginate.mockResolvedValue(
      page([log({ user_id: { _id: 'u1', name: 'Ana' } }), log({ _id: 'l2', user_id: null })]),
    );
    const res = { json: vi.fn() };
    await listAuditLogs({ validated: { query: {} } }, res);
    expect(paginate.mock.calls[0][1]).toEqual({});
    const { items } = res.json.mock.calls[0][0];
    expect(items[0].user).toEqual({ id: 'u1', name: 'Ana' });
    expect(items[1].user).toBeNull();
    expect(items[0]).toMatchObject({ id: 'l1', entity_id: 'b1', before: { title: 'A' } });
  });
});
