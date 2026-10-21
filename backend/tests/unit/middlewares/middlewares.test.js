import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../../../src/middlewares/errorHandler.js';
import { requireRole } from '../../../src/middlewares/requireRole.js';
import { validate } from '../../../src/middlewares/validate.js';
import { HttpError } from '../../../src/utils/httpError.js';

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function handle(err) {
  const res = mockRes();
  errorHandler(err, {}, res, () => {});
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe('errorHandler', () => {
  it('respeta el status y el code de un HttpError', () => {
    const { status, body } = handle(new HttpError(404, 'NOT_FOUND', 'No existe'));
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'No existe' } });
  });

  it('traduce los errores de validación de Mongoose a 400 con details', () => {
    const err = new mongoose.Error.ValidationError();
    err.addError('isbn', new mongoose.Error.ValidatorError({ message: 'ISBN no válido' }));
    const { status, body } = handle(err);
    expect(status).toBe(400);
    expect(body.error.details).toEqual([{ field: 'isbn', message: 'ISBN no válido' }]);
  });

  it('traduce un CastError a 400', () => {
    const { status } = handle(new mongoose.Error.CastError('ObjectId', 'x', '_id'));
    expect(status).toBe(400);
  });

  it.each([
    [{ isbn: 1 }, 'ISBN_TAKEN'],
    [{ email: 1 }, 'EMAIL_TAKEN'],
    [{ store_id: 1, book_id: 1 }, 'ALREADY_ASSOCIATED'],
    [{ other: 1 }, 'CONFLICT'],
  ])('traduce la clave duplicada %o a %s', (keyPattern, code) => {
    const { status, body } = handle({ code: 11000, keyPattern });
    expect(status).toBe(409);
    expect(body.error.code).toBe(code);
  });

  it('traduce un JSON mal formado a 400', () => {
    expect(handle({ type: 'entity.parse.failed' }).status).toBe(400);
    expect(handle({ type: 'entity.too.large' }).status).toBe(400);
  });

  it('oculta los errores inesperados tras un 500 genérico', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { status, body } = handle(new Error('secreto interno'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secreto interno');
    spy.mockRestore();
  });
});

describe('validate', () => {
  const schema = z.object({ n: z.coerce.number().int() });

  it('deja los datos validados en req.validated', () => {
    const req = { query: { n: '3' } };
    const nextFn = vi.fn();
    validate({ query: schema })(req, {}, nextFn);
    expect(req.validated.query).toEqual({ n: 3 });
    expect(nextFn).toHaveBeenCalled();
  });

  it('lanza VALIDATION_ERROR con el campo que falla', () => {
    const req = { body: { n: 'abc' } };
    expect(() => validate({ body: schema })(req, {}, vi.fn())).toThrow(
      expect.objectContaining({ status: 400, details: [expect.objectContaining({ field: 'n' })] }),
    );
  });
});

describe('requireRole', () => {
  it('deja pasar el rol permitido y bloquea el resto con 403', () => {
    const nextFn = vi.fn();
    requireRole('admin')({ user: { role: 'admin' } }, {}, nextFn);
    expect(nextFn).toHaveBeenCalled();
    expect(() => requireRole('admin')({ user: { role: 'user' } }, {}, vi.fn())).toThrow(
      expect.objectContaining({ status: 403, code: 'FORBIDDEN' }),
    );
  });
});
