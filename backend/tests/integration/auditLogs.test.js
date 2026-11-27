import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { createAdmin, createUser, sessionCookieFor } from '../helpers/factories.js';

const app = createApp();
let admin;
let adminCookie;

const list = (query = '', as = adminCookie) =>
  request(app).get(`/api/auditLogs${query}`).set('Cookie', as);

function createLog(overrides) {
  return AuditLog.create({
    user_id: admin._id,
    action: 'create',
    entity_type: 'book',
    entity_id: new mongoose.Types.ObjectId(),
    entity_label: 'Libro',
    ...overrides,
  });
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  admin = await createAdmin({ name: 'Ana Admin' });
  adminCookie = sessionCookieFor(admin);
});

describe('GET /api/auditLogs', () => {
  it('ordena de la más reciente a la más antigua y filtra por entity_type', async () => {
    const old = await createLog({ entity_label: 'Antiguo', created_at: new Date('2026-01-01') });
    const store = await createLog({ entity_type: 'store', entity_label: 'Tienda' });
    const recent = await createLog({ entity_label: 'Reciente', after: { title: 'Reciente' } });

    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.id)).toEqual([
      String(recent._id),
      String(store._id),
      String(old._id),
    ]);
    expect(res.body.items[0]).toEqual({
      id: String(recent._id),
      user: { id: String(admin._id), name: 'Ana Admin' },
      user_deleted: false,
      action: 'create',
      entity_type: 'book',
      entity_id: String(recent.entity_id),
      entity_label: 'Reciente',
      before: null,
      after: { title: 'Reciente' },
      created_at: expect.any(String),
    });

    const books = await list('?entity_type=book');
    expect(books.body.total).toBe(2);
    expect(books.body.items.every((i) => i.entity_type === 'book')).toBe(true);
  });

  it('user es null si la acción es del sistema', async () => {
    await createLog({ user_id: null, action: 'status_change', entity_type: 'reservation' });
    expect((await list()).body.items[0].user).toBeNull();
  });

  it('rechaza un entity_type que no existe', async () => {
    const res = await list('?entity_type=genre');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('pagina los resultados', async () => {
    for (let i = 0; i < 3; i += 1) await createLog({});
    const res = await list('?limit=2&page=2');
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 3, total_pages: 2 });
    expect(res.body.items).toHaveLength(1);
  });

  it('solo para administradores', async () => {
    const user = await createUser();
    expect((await list('', sessionCookieFor(user))).status).toBe(403);
    expect((await request(app).get('/api/auditLogs')).status).toBe(401);
  });
});

describe('inmutabilidad (FR-028)', () => {
  it('no hay rutas de escritura', async () => {
    const log = await createLog({});
    const url = `/api/auditLogs/${log._id}`;
    for (const method of ['put', 'patch', 'delete']) {
      const res = await request(app)[method](url).set('Cookie', adminCookie).send({});
      expect(res.status).toBe(404);
    }
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  it('el modelo rechaza modificar o borrar entradas', async () => {
    const log = await createLog({});
    await expect(
      AuditLog.updateOne({ _id: log._id }, { entity_label: 'Cambiado' }),
    ).rejects.toThrow('audit_logs es inmutable');
    await expect(AuditLog.deleteOne({ _id: log._id })).rejects.toThrow('audit_logs es inmutable');
    expect((await AuditLog.findById(log._id).lean()).entity_label).toBe('Libro');
    // Pasar la opción a mano en otra operación tampoco sirve: solo la acepta updateMany.
    await expect(
      AuditLog.deleteMany({ _id: log._id }, { bookiaAnonymizeAccount: false }),
    ).rejects.toThrow('audit_logs es inmutable');
  });

  it('anonymizeAccount solo quita el nombre y el correo de las entradas de la cuenta (feature 002)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const about = await createLog({
      user_id: userId,
      entity_type: 'user',
      entity_id: userId,
      action: 'role_change',
      entity_label: 'Ana',
      before: { name: 'Ana', email: 'ana@example.com', role: 'user' },
      after: { name: 'Ana', role: 'admin' },
    });
    const other = await createLog({ entity_label: 'Libro de otro' });
    await AuditLog.anonymizeAccount(userId);
    const fresh = await AuditLog.findById(about._id).lean();
    expect(fresh).toMatchObject({
      action: 'role_change',
      entity_label: 'Cuenta eliminada',
      before: { role: 'user' },
      after: { role: 'admin' },
    });
    expect(fresh.user_id).toEqual(userId);
    expect(fresh.before).not.toHaveProperty('name');
    expect(fresh.before).not.toHaveProperty('email');
    expect((await AuditLog.findById(other._id).lean()).entity_label).toBe('Libro de otro');
  });
});
