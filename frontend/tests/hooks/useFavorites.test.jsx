import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/favoritesService.js', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

const { addFavorite, removeFavorite } = await import('../../src/services/favoritesService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { useFavoriteToggle } = await import('../../src/hooks/useFavorites.js');

/** Promesa que se resuelve o rechaza cuando decide la prueba. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => vi.clearAllMocks());

describe('useFavoriteToggle', () => {
  it('cambia al instante y confirma con la API', async () => {
    const request = deferred();
    addFavorite.mockReturnValue(request.promise);
    const onChange = vi.fn();
    const { result } = renderHook(() => useFavoriteToggle('b1', false, onChange));

    act(() => {
      result.current.toggle();
    });
    // Optimista: ya se ve como favorito antes de que responda la API.
    expect(result.current.isFavorite).toBe(true);
    expect(result.current.pending).toBe(true);
    expect(addFavorite).toHaveBeenCalledWith('b1');

    await act(async () => request.resolve(null));
    expect(result.current.pending).toBe(false);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('vuelve atrás y expone el error si la API falla', async () => {
    removeFavorite.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar'));
    const onChange = vi.fn();
    const { result } = renderHook(() => useFavoriteToggle('b1', true, onChange));
    await act(async () => result.current.toggle());
    expect(result.current.isFavorite).toBe(true);
    expect(result.current.error.message).toBe('No se pudo conectar');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignora una segunda pulsación mientras la primera está en curso', async () => {
    const request = deferred();
    addFavorite.mockReturnValue(request.promise);
    const { result } = renderHook(() => useFavoriteToggle('b1', false));
    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.toggle();
    });
    expect(addFavorite).toHaveBeenCalledTimes(1);
    expect(removeFavorite).not.toHaveBeenCalled();
    await act(async () => request.resolve(null));
    expect(result.current.isFavorite).toBe(true);
  });

  it('si la API trae otro valor tras recargar, manda el servidor', async () => {
    const { result, rerender } = renderHook(({ initial }) => useFavoriteToggle('b1', initial), {
      initialProps: { initial: false },
    });
    expect(result.current.isFavorite).toBe(false);
    rerender({ initial: true });
    await waitFor(() => expect(result.current.isFavorite).toBe(true));
  });
});
