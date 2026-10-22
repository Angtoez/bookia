// Pruebas unitarias de la gestión de usuarios con los modelos mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/models/User.js', () => ({
  User: { findById: vi.fn(), updateMany: vi.fn() },
}));
vi.mock('../../../src/services/auditService.js', () => ({ record: vi.fn() }));
vi.mock('../../../src/services/cascadeService.js', () => ({ deactivateUserCascade: vi.fn() }));
vi.mock('../../../src/services/transaction.js', () => ({
  runInTransaction: vi.fn((fn) => fn('session')),
}));
vi.mock('../../../src/utils/pagination.js', () => ({ paginate: vi.fn() }));

const { User } = await import('../../../src/models/User.js');
const { record } = await import('../../../src/services/auditService.js');
const { deactivateUserCascade } = await import('../../../src/services/cascadeService.js');
const { paginate } = await import('../../../src/utils/pagination.js');
const { listUsers, updateUser } = await import('../../../src/controllers/usersController.js');

const actor = { _id: 'admin1' };
const mockRes = () => ({ json: vi.fn() });

function mockUser(fields) {
  const doc = {
    _id: 'u1',
    name: 'Luis',
    email: 'luis@example.com',
    created_at: new Date('2026-01-01'),
    password_hash: 'hash',
    ...fields,
    set: vi.fn((values) => Object.assign(doc, values)),
    save: vi.fn(),
  };
  User.findById.mockReturnValue({ session: vi.fn().mockResolvedValue(doc) });
  return doc;
}

const callUpdate = (body) => {
  const res = mockRes();
  return updateUser({ user: actor, validated: { params: { id: 'u1' }, body } }, res).then(
    () => res,
  );
};

beforeEach(() => vi.clearAllMocks());

describe('listUsers', () => {
  it('escapa q y busca en nombre y correo sin distinguir mayúsculas', async () => {
    paginate.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, total_pages: 0 });
    await listUsers({ validated: { query: { q: 'a.b' } } }, mockRes());
    const [, filter, options] = paginate.mock.calls[0];
    const [{ name }, { email }] = filter.$or;
    expect(name).toEqual(/a\.b/i);
    expect(email).toEqual(/a\.b/i);
    expect(options.sort).toEqual({ created_at: -1, _id: -1 });
  });

  it('sin q no filtra y nunca expone password_hash', async () => {
    paginate.mockResolvedValue({
      items: [mockUser({ role: 'user', status: 'active' })],
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    });
    const res = mockRes();
    await listUsers({ validated: { query: {} } }, res);
    expect(paginate.mock.calls[0][1]).toEqual({});
    expect(res.json.mock.calls[0][0].items[0]).not.toHaveProperty('password_hash');
  });
});

describe('updateUser', () => {
  it('404 si el usuario no existe', async () => {
    User.findById.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });
    await expect(callUpdate({ role: 'admin' })).rejects.toMatchObject({ status: 404 });
  });

  it('409 LAST_ADMIN si no queda otro administrador activo', async () => {
    mockUser({ role: 'admin', status: 'active' });
    User.updateMany.mockResolvedValue({ matchedCount: 0 });
    await expect(callUpdate({ status: 'disabled' })).rejects.toMatchObject({
      status: 409,
      code: 'LAST_ADMIN',
    });
    expect(record).not.toHaveBeenCalled();
    expect(deactivateUserCascade).not.toHaveBeenCalled();
  });

  it('no comprueba el último admin al promover a un usuario', async () => {
    mockUser({ role: 'user', status: 'active' });
    const res = await callUpdate({ role: 'admin' });
    expect(User.updateMany).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0]).toMatchObject({ role: 'admin' });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'role_change',
        before: { role: 'user', status: 'active' },
        after: { role: 'admin', status: 'active' },
      }),
      'session',
    );
  });

  it('desactivar ejecuta la cascada y audita status_change', async () => {
    mockUser({ role: 'user', status: 'active' });
    await callUpdate({ status: 'disabled' });
    expect(deactivateUserCascade).toHaveBeenCalledWith('u1', 'admin1', 'session');
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'status_change', entityType: 'user' });
  });

  it('desactivar una cuenta ya desactivada no repite la cascada ni audita', async () => {
    mockUser({ role: 'user', status: 'disabled' });
    await callUpdate({ status: 'disabled' });
    expect(deactivateUserCascade).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
