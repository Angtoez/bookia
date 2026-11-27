// Pruebas unitarias del controlador de autenticación con User y bcrypt mockeados (principio VI).
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcrypt', () => ({
  default: { hashSync: vi.fn(() => 'dummy-hash'), hash: vi.fn(), compare: vi.fn() },
}));
vi.mock('../../../src/models/User.js', () => ({
  User: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../src/utils/sessionCookie.js', () => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

const { default: bcrypt } = await import('bcrypt');
const { User } = await import('../../../src/models/User.js');
const { setSessionCookie } = await import('../../../src/utils/sessionCookie.js');
const { LOCK_DURATION_MS, login, register } =
  await import('../../../src/controllers/authController.js');

const body = { email: 'ana@example.com', password: 'lectora2024' };
const req = (b = body) => ({ validated: { body: b } });
const mockRes = () => {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
};
const withSelect = (value) => ({ select: async () => value });
const activeUser = (overrides = {}) => ({
  _id: 'u1',
  name: 'Ana',
  email: body.email,
  role: 'user',
  status: 'active',
  password_hash: 'real-hash',
  failed_login_count: 0,
  locked_until: null,
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('login', () => {
  it('compara contra el hash ficticio si el correo no existe', async () => {
    User.findOne.mockReturnValue(withSelect(null));
    bcrypt.compare.mockResolvedValue(false);
    await expect(login(req(), mockRes())).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(body.password, 'dummy-hash');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('no compara la contraseña real si la cuenta está bloqueada', async () => {
    const lockedUntil = new Date(Date.now() + 60000);
    User.findOne.mockReturnValue(withSelect(activeUser({ locked_until: lockedUntil })));
    bcrypt.compare.mockResolvedValue(true);
    await expect(login(req(), mockRes())).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(bcrypt.compare).toHaveBeenCalledWith(body.password, 'dummy-hash');
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('incrementa el contador con $inc en cada fallo', async () => {
    User.findOne.mockReturnValue(withSelect(activeUser()));
    bcrypt.compare.mockResolvedValue(false);
    User.findOneAndUpdate.mockResolvedValue({ failed_login_count: 3 });
    await expect(login(req(), mockRes())).rejects.toMatchObject({ status: 401 });
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $inc: { failed_login_count: 1 } },
      { new: true },
    );
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it('bloquea la cuenta 15 minutos al 5.º fallo y reinicia el contador', async () => {
    User.findOne.mockReturnValue(withSelect(activeUser({ failed_login_count: 4 })));
    bcrypt.compare.mockResolvedValue(false);
    User.findOneAndUpdate.mockResolvedValue({ failed_login_count: 5 });
    const before = Date.now();
    await expect(login(req(), mockRes())).rejects.toMatchObject({ status: 401 });
    const [filter, update] = User.updateOne.mock.calls[0];
    expect(filter._id).toBe('u1');
    expect(filter.failed_login_count.$gte).toBe(5);
    expect(update.$set.failed_login_count).toBe(0);
    expect(update.$set.locked_until.getTime()).toBeGreaterThanOrEqual(before + LOCK_DURATION_MS);
  });

  it('un acierto tras fallos reinicia el contador y abre sesión', async () => {
    User.findOne.mockReturnValue(withSelect(activeUser({ failed_login_count: 2 })));
    bcrypt.compare.mockResolvedValue(true);
    const res = mockRes();
    await login(req(), res);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failed_login_count: 0, locked_until: null } },
    );
    expect(setSessionCookie).toHaveBeenCalledWith(res, expect.objectContaining({ _id: 'u1' }));
    expect(res.json).toHaveBeenCalledWith({
      id: 'u1',
      name: 'Ana',
      email: body.email,
      role: 'user',
    });
  });

  it('una cuenta desactivada recibe el 401 genérico', async () => {
    User.findOne.mockReturnValue(withSelect(activeUser({ status: 'disabled' })));
    bcrypt.compare.mockResolvedValue(true);
    await expect(login(req(), mockRes())).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(setSessionCookie).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  it('crea el usuario con rol user, abre sesión y responde 201', async () => {
    bcrypt.hash.mockResolvedValue('nuevo-hash');
    User.create.mockResolvedValue(activeUser({ password_hash: 'nuevo-hash' }));
    const res = mockRes();
    await register(req({ name: 'Ana', ...body }), res);
    expect(bcrypt.hash).toHaveBeenCalledWith(body.password, 10);
    expect(User.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: body.email,
      password_hash: 'nuevo-hash',
      role: 'user',
    });
    expect(setSessionCookie).toHaveBeenCalledWith(res, expect.objectContaining({ _id: 'u1' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('password_hash');
  });
});
