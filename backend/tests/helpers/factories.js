// Fábricas de datos para las pruebas de integración.
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Book } from '../../src/models/Book.js';
import { Genre } from '../../src/models/Genre.js';
import { Store } from '../../src/models/Store.js';
import { StoreBook } from '../../src/models/StoreBook.js';
import { User } from '../../src/models/User.js';
import { ENV } from '../../src/config/env.js';
import { SESSION_COOKIE } from '../../src/utils/sessionCookie.js';

export const DEFAULT_PASSWORD = 'secreto123';
let seq = 0;
const next = () => (seq += 1);

export async function createUser(overrides = {}) {
  const n = next();
  const { password = DEFAULT_PASSWORD, ...rest } = overrides;
  return User.create({
    name: `Usuario ${n}`,
    email: `usuario${n}@example.com`,
    password_hash: await bcrypt.hash(password, 4),
    ...rest,
  });
}

export const createAdmin = (overrides = {}) => createUser({ role: 'admin', ...overrides });

export async function createGenre(overrides = {}) {
  const n = next();
  return Genre.create({ name: `Género ${n}`, slug: `genero-${n}`, ...overrides });
}

// ISBN-13 válido a partir de un número de secuencia (prefijo 978 + dígito de control).
export function makeIsbn(n) {
  const base = `978${String(n).padStart(9, '0')}`;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  return `${base}${(10 - (sum % 10)) % 10}`;
}

export async function createBook(overrides = {}) {
  const n = next();
  const genreId = overrides.genre_id ?? (await createGenre())._id;
  return Book.create({
    title: `Libro ${n}`,
    author: `Autor ${n}`,
    isbn: makeIsbn(n),
    price_cents: 20000,
    ...overrides,
    genre_id: genreId,
  });
}

export async function createStore(overrides = {}) {
  const n = next();
  return Store.create({
    name: `Tienda ${n}`,
    address: `Calle de ejemplo ${n}, Huauchinango, Puebla`,
    opening_hours: 'L–V 9:00–19:00',
    ...overrides,
  });
}

export function createStoreBook(overrides) {
  return StoreBook.create({ stock: 5, ...overrides });
}

/** Inicia sesión y devuelve la cookie de sesión lista para .set('Cookie', …). */
export async function loginAs(app, user, password = DEFAULT_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
  if (res.status !== 200) throw new Error(`loginAs falló con ${res.status}`);
  return res.headers['set-cookie'][0].split(';')[0];
}

/** Cookie de sesión firmada sin pasar por /login (útil cuando el límite por IP estorba). */
export function sessionCookieFor(user) {
  const payload = { sub: String(user._id), ver: user.session_version ?? 0 };
  const token = jwt.sign(payload, ENV.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
  return `${SESSION_COOKIE}=${token}`;
}
