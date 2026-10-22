import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UNAUTHORIZED_EVENT, apiRequest } from '../../src/services/apiClient.js';

const jsonResponse = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let fetchMock;

beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
});

describe('apiRequest', () => {
  it('envía la cookie, serializa el cuerpo y construye la query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const data = await apiRequest('/books', {
      method: 'POST',
      body: { title: 'A' },
      query: { q: 'cien años', genre: '', page: 2, limit: undefined },
    });
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/books?q=cien+a%C3%B1os&page=2');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":"A"}',
    });
  });

  it('un 204 devuelve null', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await apiRequest('/favorites/1', { method: 'PUT' })).toBeNull();
  });

  it('lanza ApiError con code, message y details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos no válidos',
          details: [{ field: 'isbn', message: 'ISBN no válido' }],
        },
      }),
    );
    const error = await apiRequest('/books', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos no válidos',
    });
    expect(error.fieldErrors).toEqual({ isbn: 'ISBN no válido' });
  });

  it('un cuerpo de error ilegible da INTERNAL_ERROR con un mensaje genérico', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(apiRequest('/books')).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      message: 'Ha ocurrido un error inesperado',
    });
  });

  it('un fallo de red da NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/books')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('emite auth:unauthorized ante un 401, salvo en /auth/login y /auth/me', async () => {
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    const unauthorized = { error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión' } };
    fetchMock.mockImplementation(async () => jsonResponse(401, unauthorized));

    await expect(apiRequest('/favorites')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
    await expect(apiRequest('/auth/me')).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
