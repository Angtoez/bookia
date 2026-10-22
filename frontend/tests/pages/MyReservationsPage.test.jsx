import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/reservationsService.js', () => ({
  listMyReservations: vi.fn(),
  listReservations: vi.fn(),
  cancelReservation: vi.fn(),
}));
vi.mock('../../src/services/configService.js', () => ({ getConfig: vi.fn() }));

const service = await import('../../src/services/reservationsService.js');
const { getConfig } = await import('../../src/services/configService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { MyReservationsPage } = await import('../../src/pages/MyReservationsPage.jsx');

const reservation = (id, extra = {}) => ({
  id,
  book_id: `b-${id}`,
  store_id: 's1',
  book_title: `Libro ${id}`,
  store_name: 'Librería Centro',
  store_address: 'Calle 1',
  price_cents: 18550,
  status: 'pending',
  cancel_reason: null,
  created_at: '2026-10-20T10:00:00.000Z',
  ready_at: null,
  expires_at: '2026-10-27T10:00:00.000Z',
  closed_at: null,
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

let currentSearch = '';
function Probe() {
  currentSearch = useLocation().search;
  return null;
}

function renderPage(url = '/me/reservations') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/me/reservations"
          element={
            <>
              <MyReservationsPage />
              <Probe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfig.mockResolvedValue({ currency: 'MXN' });
});

describe('MyReservationsPage', () => {
  it('muestra estado, tienda, precio, fechas y el motivo de cancelación', async () => {
    service.listMyReservations.mockResolvedValue(
      page([
        reservation('r1', { status: 'ready', ready_at: '2026-10-21T10:00:00.000Z' }),
        reservation('r2', {
          status: 'cancelled',
          cancel_reason: 'store_deleted',
          expires_at: null,
          closed_at: '2026-10-22T09:00:00.000Z',
        }),
        reservation('r3', {
          status: 'cancelled',
          cancel_reason: 'user',
          expires_at: null,
          closed_at: '2026-10-22T09:00:00.000Z',
        }),
      ]),
    );
    renderPage();
    const [ready, closed, mine] = await screen.findAllByRole('listitem');
    expect(within(ready).getByText('Lista para recoger')).toBeInTheDocument();
    expect(within(ready).getByText(/Recógela antes del/)).toBeInTheDocument();
    expect(within(ready).getByText(/Librería Centro · Calle 1/)).toBeInTheDocument();
    await waitFor(() => expect(within(ready).getByText(/185,50/)).toBeInTheDocument());
    expect(within(closed).getByText(/\(establecimiento cerrado\)/)).toBeInTheDocument();
    expect(within(closed).queryByRole('button', { name: /cancelar/i })).toBeNull();
    expect(within(mine).getByText(/\(por ti\)/)).toBeInTheDocument();
  });

  it('cancela una reserva activa tras confirmar', async () => {
    const user = userEvent.setup();
    service.listMyReservations.mockResolvedValue(page([reservation('r1')]));
    service.cancelReservation.mockResolvedValue(reservation('r1', { status: 'cancelled' }));
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Cancelar la reserva de «Libro r1»' }),
    );
    const dialog = screen.getByRole('dialog');
    service.listMyReservations.mockResolvedValue(
      page([reservation('r1', { status: 'cancelled', cancel_reason: 'user' })]),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar reserva' }));
    expect(service.cancelReservation).toHaveBeenCalledWith('r1');
    expect(await screen.findByText('Has cancelado la reserva de «Libro r1».')).toBeInTheDocument();
    expect(await screen.findByText(/\(por ti\)/)).toBeInTheDocument();
  });

  it('un 409 al cancelar se explica y no deja reintentar', async () => {
    const user = userEvent.setup();
    service.listMyReservations.mockResolvedValue(page([reservation('r1')]));
    service.cancelReservation.mockRejectedValue(
      new ApiError(409, 'INVALID_TRANSITION', 'La reserva no admite ese cambio de estado'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Cancelar la reserva/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar reserva' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('no admite ese cambio');
    expect(within(dialog).getByRole('button', { name: 'Cancelar reserva' })).toBeDisabled();
  });

  it('filtra por estado con la URL e ignora estados desconocidos', async () => {
    const user = userEvent.setup();
    service.listMyReservations.mockResolvedValue(page([]));
    renderPage('/me/reservations?status=raro');
    expect(await screen.findByText('Todavía no has reservado ningún libro.')).toBeInTheDocument();
    expect(service.listMyReservations).toHaveBeenCalledWith({ status: undefined, page: 1 });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'ready');
    await waitFor(() => expect(currentSearch).toBe('?status=ready'));
    expect(await screen.findByText('No tienes reservas en este estado.')).toBeInTheDocument();
    expect(service.listMyReservations).toHaveBeenLastCalledWith({ status: 'ready', page: 1 });
  });
});
