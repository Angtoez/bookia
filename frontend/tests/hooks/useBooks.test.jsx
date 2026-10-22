import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/booksService.js', () => ({ listBooks: vi.fn(), getBook: vi.fn() }));

const { getBook, listBooks } = await import('../../src/services/booksService.js');
const { useBooks } = await import('../../src/hooks/useBooks.js');
const { useBook } = await import('../../src/hooks/useBook.js');
const { ApiError } = await import('../../src/services/apiClient.js');

const page = (items = []) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

function renderAt(url, hook) {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
  return renderHook(() => ({ ...hook(), location: useLocation() }), { wrapper });
}

beforeEach(() => {
  listBooks.mockReset().mockResolvedValue(page());
  getBook.mockReset();
});

describe('useBooks', () => {
  it('lee q, genre y page de la URL', async () => {
    const { result } = renderAt('/?q=cien&genre=novela&page=3', useBooks);
    expect(result.current.params).toEqual({ q: 'cien', genre: 'novela', page: 3 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listBooks).toHaveBeenCalledWith({ q: 'cien', genre: 'novela', page: 3 });
    expect(result.current.data).toEqual(page());
  });

  it('una página no válida se trata como la primera', () => {
    const { result } = renderAt('/?page=-2', useBooks);
    expect(result.current.params.page).toBe(1);
  });

  it('cambiar la búsqueda escribe la URL y vuelve a la primera página', async () => {
    const { result } = renderAt('/?genre=novela&page=4', useBooks);
    act(() => result.current.setParams({ q: 'años' }));
    await waitFor(() => expect(result.current.params.q).toBe('años'));
    expect(result.current.location.search).toBe('?genre=novela&q=a%C3%B1os');
    expect(result.current.params.page).toBe(1);

    act(() => result.current.setParams({ page: 2 }));
    await waitFor(() => expect(result.current.params.page).toBe(2));
    act(() => result.current.setParams({ genre: '' }));
    await waitFor(() => expect(result.current.location.search).toBe('?q=a%C3%B1os'));
  });

  it('clearFilters vacía la URL', async () => {
    const { result } = renderAt('/?q=x&genre=y&page=2', useBooks);
    act(() => result.current.clearFilters());
    await waitFor(() => expect(result.current.location.search).toBe(''));
  });

  it('expone el error y reload vuelve a pedir', async () => {
    listBooks.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Fallo'));
    const { result } = renderAt('/', useBooks);
    await waitFor(() => expect(result.current.error?.message).toBe('Fallo'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(listBooks).toHaveBeenCalledTimes(2);
  });
});

describe('useBook', () => {
  it('devuelve el libro', async () => {
    getBook.mockResolvedValue({ id: 'b1', stores: [] });
    const { result } = renderAt('/', () => useBook('b1'));
    await waitFor(() => expect(result.current.book).toEqual({ id: 'b1', stores: [] }));
    expect(result.current.notFound).toBe(false);
  });

  it('un 404 se marca como notFound y no como error', async () => {
    getBook.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Libro no encontrado'));
    const { result } = renderAt('/', () => useBook('b1'));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.error).toBeNull();
  });
});
