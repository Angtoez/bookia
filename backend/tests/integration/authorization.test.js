// Autorización transversal (T128): todas las rutas de gestión de contracts/rest-api.md contra
// los roles anónimo, user y admin (SC-006, FR-007), y una revisión de la pila de Express para
// que ninguna ruta con authenticate se quede sin requireRole (principio II).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb, startDb, stopDb } from '../helpers/db.js';
import { createAdmin, createUser, sessionCookieFor } from '../helpers/factories.js';

const app = createApp();
// Ids bien formados que no existen: el administrador llega a 404 o 400, nunca a 401/403.
const ID = '0123456789abcdef01234567';
const OTHER = '89abcdef0123456789abcdef';

// [método, ruta]: las rutas de gestión, solo para administradores.
const ADMIN_ROUTES = [
  ['post', '/api/books'],
  ['patch', `/api/books/${ID}`],
  ['get', `/api/books/${ID}/deletionImpact`],
  ['delete', `/api/books/${ID}`],
  ['get', '/api/stores'],
  ['post', '/api/stores'],
  ['get', `/api/stores/${ID}`],
  ['patch', `/api/stores/${ID}`],
  ['get', `/api/stores/${ID}/deletionImpact`],
  ['delete', `/api/stores/${ID}`],
  ['get', `/api/stores/${ID}/books`],
  ['post', `/api/stores/${ID}/books`],
  ['patch', `/api/stores/${ID}/books/${OTHER}`],
  ['delete', `/api/stores/${ID}/books/${OTHER}`],
  ['get', '/api/reservations'],
  ['post', `/api/reservations/${ID}/ready`],
  ['post', `/api/reservations/${ID}/pickup`],
  ['get', '/api/users'],
  ['patch', `/api/users/${ID}`],
  ['get', '/api/auditLogs'],
];

// Mi cuenta (feature 002): de cualquier rol, sobre la propia cuenta. Con un cuerpo vacío no se
// cambia ni se borra nada: las escrituras se quedan en 400 de validación.
const ACCOUNT_ROUTES = [
  ['get', '/api/account'],
  ['patch', '/api/account'],
  ['post', '/api/account/password'],
  ['get', '/api/account/export'],
  ['delete', '/api/account'],
];

let userCookie;
let adminCookie;

beforeAll(async () => {
  await startDb();
  await clearDb();
  userCookie = sessionCookieFor(await createUser());
  adminCookie = sessionCookieFor(await createAdmin());
});
afterAll(stopDb);

const call = (method, path, cookie) => {
  const req = request(app)[method](path);
  if (cookie) req.set('Cookie', cookie);
  return ['post', 'patch', 'put'].includes(method) ? req.send({}) : req;
};

describe.each(ADMIN_ROUTES)('%s %s', (method, path) => {
  it('anónimo → 401, user → 403 y admin pasa el control de acceso', async () => {
    expect((await call(method, path)).status).toBe(401);
    expect((await call(method, path, userCookie)).status).toBe(403);
    const admin = await call(method, path, adminCookie);
    expect([401, 403]).not.toContain(admin.status);
    expect(admin.status).toBeLessThan(500);
  });
});

describe.each(ACCOUNT_ROUTES)('%s %s', (method, path) => {
  it('anónimo → 401; user y admin pasan el control de acceso (no 403)', async () => {
    expect((await call(method, path)).status).toBe(401);
    for (const cookie of [userCookie, adminCookie]) {
      const res = await call(method, path, cookie);
      expect([401, 403]).not.toContain(res.status);
      expect([200, 400]).toContain(res.status);
    }
  });
});

/** Rutas de la app con si llevan authenticate y requireRole (en la ruta o en un use previo). */
function collectRoutes(stack, inherited = { auth: false, role: false }) {
  const found = [];
  const current = { ...inherited };
  for (const layer of stack) {
    if (layer.route) {
      const names = layer.route.stack.map((l) => l.name);
      found.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        auth: current.auth || names.includes('authenticate'),
        role: current.role || names.includes('requireRoleMiddleware'),
      });
    } else if (layer.handle?.stack) {
      found.push(...collectRoutes(layer.handle.stack, current));
    } else if (layer.name === 'authenticate') {
      current.auth = true;
    } else if (layer.name === 'requireRoleMiddleware') {
      current.role = true;
    }
  }
  return found;
}

describe('pila de Express', () => {
  it('toda ruta con authenticate lleva también requireRole', () => {
    const routes = collectRoutes(app.router.stack);
    // Sanidad: la revisión de verdad recorre la API (las 20 de gestión y las demás).
    expect(routes.length).toBeGreaterThan(30);
    const sinRol = routes.filter((r) => r.auth && !r.role);
    expect(sinRol).toEqual([]);
    // Y las rutas protegidas lo son de verdad: al menos las de gestión.
    expect(routes.filter((r) => r.auth).length).toBeGreaterThanOrEqual(ADMIN_ROUTES.length);
  });
});
