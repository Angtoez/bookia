// Pruebas unitarias de Mi cuenta con los modelos y servicios mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/models/User.js', () => ({ User: { updateOne: vi.fn() } }));
vi.mock('../../../src/services/auditService.js', () => ({ record: vi.fn() }));
vi.mock('../../../src/services/transaction.js', () => ({
  runInTransaction: vi.fn((fn) => fn('session')),
}));

const { User } = await import('../../../src/models/User.js');
const { record } = await import('../../../src/services/auditService.js');
const { getAccount, updateAccount } = await import('../../../src/controllers/accountController.js');

const mockRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn() });

const account = (fields = {}) => ({
  _id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'user',
  created_at: new Date('2026-01-01'),
  password_hash: 'hash',
  session_version: 0,
  ...fields,
});

beforeEach(() => vi.clearAllMocks());

describe('perfil', () => {
  it('getAccount presenta la cuenta sin campos internos', () => {
    const res = mockRes();
    getAccount({ user: account() }, res);
    expect(res.json).toHaveBeenCalledWith({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'user',
      created_at: new Date('2026-01-01'),
    });
  });

  it('updateAccount guarda y audita solo si el nombre cambia', async () => {
    const user = account();
    const res = mockRes();
    await updateAccount({ user, validated: { body: { name: 'Ana María' } } }, res);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { name: 'Ana María' } },
      { session: 'session' },
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'update',
        entityType: 'user',
        entityId: 'u1',
        before: { name: 'Ana' },
        after: { name: 'Ana María' },
      }),
      'session',
    );
    expect(res.json.mock.calls[0][0].name).toBe('Ana María');
  });

  it('updateAccount con el mismo nombre no escribe nada', async () => {
    const res = mockRes();
    await updateAccount({ user: account(), validated: { body: { name: 'Ana' } } }, res);
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].name).toBe('Ana');
  });
});
