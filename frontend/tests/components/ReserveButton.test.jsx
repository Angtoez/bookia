import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/reservationsService.js', () => ({ createReservation: vi.fn() }));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { createReservation } = await import('../../src/services/reservationsService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { ReserveButton } = await import('../../src/components/ReserveButton.jsx');

const book = { id: 'b1', title: 'Rayuela' };
const store = {
  store_id: 's1',
  name: 'Librería Centro',
  address: 'Calle 1',
  price_cents: 18550,
  available: 2,
  is_sold_out: false,
};
const config = { currency: 'MXN', pending_ttl_days: 7, pickup_ttl_days: 3 };

function renderButton(props = {}) {
  const onReserved = vi.fn();
  render(
    <MemoryRouter initialEntries={['/books/b1']}>
      <ReserveButton book={book} store={store} config={config} onReserved={onReserved} {...props} />
    </MemoryRouter>,
  );
  return onReserved;
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ status: 'authenticated', user: { id: 'u1' } });
});

describe('ReserveButton', () => {
  it('un visitante va al login con next a la página del libro', () => {
    useAuth.mockReturnValue({ status: 'anonymous', user: null });
    renderButton();
    expect(screen.getByRole('link', { name: 'Inicia sesión para reservar' })).toHaveAttribute(
      'href',
      '/login?next=%2Fbooks%2Fb1',
    );
  });

  it('no se muestra si la tienda está agotada', () => {
    renderButton({ store: { ...store, available: 0, is_sold_out: true } });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('confirma con el precio y los plazos, y reserva', async () => {
    const user = userEvent.setup();
    const reservation = { id: 'r1', book_title: 'Rayuela', store_name: 'Librería Centro' };
    createReservation.mockResolvedValue(reservation);
    const onReserved = renderButton();
    await user.click(screen.getByRole('button', { name: 'Reservar en Librería Centro' }));
    const dialog = screen.getByRole('dialog', { name: '¿Reservar «Rayuela»?' });
    expect(dialog).toHaveTextContent(/185,50/);
    expect(dialog).toHaveTextContent('La tienda tiene 7 días para prepararla');
    expect(dialog).toHaveTextContent('tendrás 3 días para recogerla');
    await user.click(within(dialog).getByRole('button', { name: 'Reservar' }));
    expect(createReservation).toHaveBeenCalledWith({ bookId: 'b1', storeId: 's1' });
    expect(onReserved).toHaveBeenCalledWith(reservation);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('muestra el 409 de la API en el diálogo', async () => {
    const user = userEvent.setup();
    createReservation.mockRejectedValue(
      new ApiError(409, 'RESERVATION_LIMIT', 'Ya tienes 5 reservas activas, el máximo permitido'),
    );
    const onReserved = renderButton();
    await user.click(screen.getByRole('button', { name: 'Reservar en Librería Centro' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reservar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('5 reservas activas');
    expect(onReserved).not.toHaveBeenCalled();
  });
});
