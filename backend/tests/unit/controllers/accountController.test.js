// Pruebas unitarias de Mi cuenta con los modelos y servicios mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/models/User.js', () => ({
  User: { updateOne: vi.fn(), findById: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(), hash: vi.fn() } }));
vi.mock('../../../src/utils/sessionCookie.js', () => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));
vi.mock('../../../src/services/auditService.js', () => ({ record: vi.fn() }));
vi.mock('../../../src/services/accountService.js', () => ({
  deleteAccountCascade: vi.fn(),
  buildAccountExport: vi.fn(),
}));
vi.mock('../../../src/services/transaction.js', () => ({
  runInTransaction: vi.fn((fn) => fn('session')),
}));

const { User } = await import('../../../src/models/User.js');
const { record } = await import('../../../src/services/auditService.js');
const { default: bcrypt } = await import('bcrypt');
const { clearSessionCookie, setSessionCookie } =
  await import('../../../src/utils/sessionCookie.js');
const { deleteAccountCascade } = await import('../../../src/services/accountService.js');
const { changePassword, deleteAccount, getAccount, updateAccount } =
  await import('../../../src/controllers/accountController.js');

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

describe('contraseña', () => {
  const body = { current_password: 'actual-1', new_password: 'nueva-clave9' };
  const withHash = (user) =>
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ ...user, password_hash: 'hash' }),
    });

  it('no guarda nada si la contraseña actual no coincide', async () => {
    withHash(account());
    bcrypt.compare.mockResolvedValue(false);
    await expect(
      changePassword({ user: account(), validated: { body } }, mockRes()),
    ).rejects.toMatchObject({ status: 400, code: 'WRONG_PASSWORD' });
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('sube la versión de sesión, audita y renueva la cookie', async () => {
    withHash(account());
    bcrypt.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    bcrypt.hash.mockResolvedValue('hash-nuevo');
    const updated = account({ session_version: 1 });
    User.findOneAndUpdate.mockResolvedValue(updated);
    const res = mockRes();
    await changePassword({ user: account(), validated: { body } }, res);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { password_hash: 'hash-nuevo' }, $inc: { session_version: 1 } },
      { new: true, session: 'session' },
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', before: null, after: { password: 'changed' } }),
      'session',
    );
    expect(setSessionCookie).toHaveBeenCalledWith(res, updated);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('borrado', () => {
  const withHash = () =>
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ ...account(), password_hash: 'hash' }),
    });

  it('no borra nada si la contraseña no coincide', async () => {
    withHash();
    bcrypt.compare.mockResolvedValue(false);
    await expect(
      deleteAccount({ user: account(), validated: { body: { password: 'x' } } }, mockRes()),
    ).rejects.toMatchObject({ status: 400, code: 'WRONG_PASSWORD' });
    expect(deleteAccountCascade).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it('borra en una transacción, cierra la sesión y responde 204', async () => {
    withHash();
    bcrypt.compare.mockResolvedValue(true);
    const user = account();
    const res = mockRes();
    await deleteAccount({ user, validated: { body: { password: 'secreto123' } } }, res);
    expect(deleteAccountCascade).toHaveBeenCalledWith(user, 'session');
    expect(clearSessionCookie).toHaveBeenCalledWith(res);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
