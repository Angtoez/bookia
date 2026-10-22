import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/apiClient.js', async (importOriginal) => ({
  ...(await importOriginal()),
  apiRequest: vi.fn(),
}));

const { ApiError, apiRequest } = await import('../../src/services/apiClient.js');
const authService = await import('../../src/services/authService.js');
const { getConfig, listGenres, resetConfigCache } =
  await import('../../src/services/configService.js');
const { createBook, deleteBook, getBook, getBookDeletionImpact, listBooks, updateBook } =
  await import('../../src/services/booksService.js');
const storesService = await import('../../src/services/storesService.js');
const reservationsService = await import('../../src/services/reservationsService.js');
const favoritesService = await import('../../src/services/favoritesService.js');
const usersService = await import('../../src/services/usersService.js');
const auditLogsService = await import('../../src/services/auditLogsService.js');

beforeEach(() => {
  apiRequest.mockReset();
  resetConfigCache();
});

describe('authService', () => {
  it('login, logout y me llaman a sus rutas', async () => {
    apiRequest.mockResolvedValue({ id: 'u1' });
    await authService.login('a@b.com', 'secreto123');
    await authService.logout();
    expect(await authService.me()).toEqual({ id: 'u1' });
    expect(apiRequest.mock.calls).toEqual([
      ['/auth/login', { method: 'POST', body: { email: 'a@b.com', password: 'secreto123' } }],
      ['/auth/logout', { method: 'POST' }],
      ['/auth/me'],
    ]);
  });

  it('register envía solo nombre, correo y contraseña', async () => {
    apiRequest.mockResolvedValue({ id: 'u1', role: 'user' });
    await authService.register({ name: 'Ana', email: 'a@b.com', password: 'x1', role: 'admin' });
    expect(apiRequest).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: { name: 'Ana', email: 'a@b.com', password: 'x1' },
    });
  });

  it('me devuelve null sin sesión y propaga otros errores', async () => {
    apiRequest.mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED', 'x'));
    expect(await authService.me()).toBeNull();
    apiRequest.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'));
    await expect(authService.me()).rejects.toMatchObject({ status: 500 });
  });
});

describe('configService', () => {
  it('getConfig se pide una sola vez', async () => {
    apiRequest.mockResolvedValue({ currency: 'EUR' });
    await getConfig();
    expect(await getConfig()).toEqual({ currency: 'EUR' });
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('si getConfig falla, el siguiente intento vuelve a pedirla', async () => {
    apiRequest.mockRejectedValueOnce(new Error('caída')).mockResolvedValue({ currency: 'EUR' });
    await expect(getConfig()).rejects.toThrow('caída');
    expect(await getConfig()).toEqual({ currency: 'EUR' });
  });

  it('listGenres', async () => {
    apiRequest.mockResolvedValue([]);
    await listGenres();
    expect(apiRequest).toHaveBeenCalledWith('/genres');
  });
});

describe('booksService', () => {
  it('listBooks pasa los filtros como query y getBook codifica el id', async () => {
    apiRequest.mockResolvedValue({});
    await listBooks({ q: 'cien', genre: 'novela', page: 2 });
    await getBook('a/b');
    expect(apiRequest.mock.calls).toEqual([
      ['/books', { query: { q: 'cien', genre: 'novela', page: 2, limit: undefined } }],
      ['/books/a%2Fb'],
    ]);
  });

  it('gestión de libros: POST, PATCH, deletionImpact y DELETE', async () => {
    apiRequest.mockResolvedValue(null);
    await createBook({ title: 'A' });
    await updateBook('b1', { price_cents: 100 });
    await getBookDeletionImpact('b1');
    await deleteBook('b1');
    expect(apiRequest.mock.calls).toEqual([
      ['/books', { method: 'POST', body: { title: 'A' } }],
      ['/books/b1', { method: 'PATCH', body: { price_cents: 100 } }],
      ['/books/b1/deletionImpact'],
      ['/books/b1', { method: 'DELETE' }],
    ]);
  });
});

describe('storesService', () => {
  it('llama a las rutas de tiendas e inventario', async () => {
    apiRequest.mockResolvedValue(null);
    await storesService.listStores({ page: 2 });
    await storesService.getStore('s1');
    await storesService.createStore({ name: 'A' });
    await storesService.updateStore('s1', { phone: null });
    await storesService.getStoreDeletionImpact('s1');
    await storesService.deleteStore('s1');
    await storesService.listStoreBooks('s1', { page: 1 });
    await storesService.addStoreBook('s1', { book_id: 'b1', stock: 2 });
    await storesService.updateStoreBook('s1', 'b1', { store_price_cents: null });
    await storesService.removeStoreBook('s1', 'b1');
    expect(apiRequest.mock.calls).toEqual([
      ['/stores', { query: { page: 2, limit: undefined } }],
      ['/stores/s1'],
      ['/stores', { method: 'POST', body: { name: 'A' } }],
      ['/stores/s1', { method: 'PATCH', body: { phone: null } }],
      ['/stores/s1/deletionImpact'],
      ['/stores/s1', { method: 'DELETE' }],
      ['/stores/s1/books', { query: { page: 1, limit: undefined } }],
      ['/stores/s1/books', { method: 'POST', body: { book_id: 'b1', stock: 2 } }],
      ['/stores/s1/books/b1', { method: 'PATCH', body: { store_price_cents: null } }],
      ['/stores/s1/books/b1', { method: 'DELETE' }],
    ]);
  });
});

describe('reservationsService', () => {
  it('llama a las rutas de reservas', async () => {
    apiRequest.mockResolvedValue(null);
    await reservationsService.createReservation({ bookId: 'b1', storeId: 's1' });
    await reservationsService.listMyReservations({ status: 'ready', page: 2 });
    await reservationsService.cancelReservation('r1');
    await reservationsService.listReservations({ status: 'pending', store_id: 's1', page: 1 });
    await reservationsService.markReady('r1');
    await reservationsService.markPickedUp('r1');
    expect(apiRequest.mock.calls).toEqual([
      ['/reservations', { method: 'POST', body: { book_id: 'b1', store_id: 's1' } }],
      ['/reservations/mine', { query: { status: 'ready', page: 2, limit: undefined } }],
      ['/reservations/r1/cancel', { method: 'POST' }],
      [
        '/reservations',
        { query: { status: 'pending', store_id: 's1', page: 1, limit: undefined } },
      ],
      ['/reservations/r1/ready', { method: 'POST' }],
      ['/reservations/r1/pickup', { method: 'POST' }],
    ]);
  });
});

describe('favoritesService', () => {
  it('llama a las rutas de favoritos', async () => {
    apiRequest.mockResolvedValue(null);
    await favoritesService.listFavorites({ page: 2 });
    await favoritesService.addFavorite('b1');
    await favoritesService.removeFavorite('b1');
    expect(apiRequest.mock.calls).toEqual([
      ['/favorites', { query: { page: 2, limit: undefined } }],
      ['/favorites/b1', { method: 'PUT' }],
      ['/favorites/b1', { method: 'DELETE' }],
    ]);
  });
});

describe('usersService y auditLogsService', () => {
  it('llaman a sus rutas', async () => {
    apiRequest.mockResolvedValue(null);
    await usersService.listUsers({ q: 'ana', page: 2 });
    await usersService.updateUser('u1', { role: 'admin' });
    await auditLogsService.listAuditLogs({ entity_type: 'book', page: 1 });
    expect(apiRequest.mock.calls).toEqual([
      ['/users', { query: { q: 'ana', page: 2, limit: undefined } }],
      ['/users/u1', { method: 'PATCH', body: { role: 'admin' } }],
      ['/auditLogs', { query: { entity_type: 'book', page: 1, limit: undefined } }],
    ]);
  });
});
