import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/reservationsService.js', () => ({
  listMyReservations: vi.fn(),
  listReservations: vi.fn(),
  cancelReservation: vi.fn(),
  markReady: vi.fn(),
  markPickedUp: vi.fn(),
}));
vi.mock('../../src/services/storesService.js', () => ({ listStores: vi.fn() }));

const service = await import('../../src/services/reservationsService.js');
const { listStores } = await import('../../src/services/storesService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { AdminReservationsPage } = await import('../../src/pages/admin/AdminReservationsPage.jsx');

const reservation = (id, status, extra = {}) => ({
  id,
  book_title: `Libro ${id}`,
  store_name: 'Librería Centro',
  status,
  cancel_reason: null,
  created_at: '2026-10-20T10:00:00.000Z',
  ready_at: null,
  expires_at: null,
  closed_at: null,
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

let currentSearch = '';
function Probe() {
  currentSearch = useLocation().search;
  return null;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/reservations']}>
      <Routes>
        <Route
          path="/admin/reservations"
          element={
            <>
              <AdminReservationsPage />
              <Probe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const rowOf = async (title) =>
  within((await screen.findByRole('rowheader', { name: title })).closest('tr'));

beforeEach(() => {
  vi.clearAllMocks();
  listStores.mockResolvedValue(page([{ id: 's1', name: 'Librería Centro' }]));
  service.listReservations.mockResolvedValue(
    page([
      reservation('r1', 'pending'),
      reservation('r2', 'ready'),
      reservation('r3', 'cancelled', { cancel_reason: 'user' }),
    ]),
  );
});

describe('AdminReservationsPage', () => {
  it('ofrece solo las acciones válidas para cada estado', async () => {
    renderPage();
    const pending = await rowOf('Libro r1');
    expect(pending.getByText('ana@example.com')).toBeInTheDocument();
    expect(pending.getByRole('button', { name: /^Marcar lista/ })).toBeInTheDocument();
    expect(pending.queryByRole('button', { name: /^Marcar recogida/ })).toBeNull();
    const ready = await rowOf('Libro r2');
    expect(ready.getByRole('button', { name: /^Marcar recogida/ })).toBeInTheDocument();
    expect(ready.getByRole('button', { name: /^Cancelar/ })).toBeInTheDocument();
    const cancelled = await rowOf('Libro r3');
    expect(cancelled.queryByRole('button')).toBeNull();
    expect(cancelled.getByText('por el usuario')).toBeInTheDocument();
  });

  it('una reserva de una cuenta borrada muestra «Cuenta eliminada» (feature 002)', async () => {
    service.listReservations.mockResolvedValue(
      page([reservation('r4', 'cancelled', { user: null, cancel_reason: 'account_deleted' })]),
    );
    renderPage();
    const row = await rowOf('Libro r4');
    expect(row.getByText('Cuenta eliminada')).toBeInTheDocument();
    expect(row.getByText('cuenta eliminada')).toBeInTheDocument();
  });

  it('marca una reserva como lista tras confirmar y recarga', async () => {
    const user = userEvent.setup();
    service.markReady.mockResolvedValue(reservation('r1', 'ready'));
    renderPage();
    await user.click((await rowOf('Libro r1')).getByRole('button', { name: /^Marcar lista/ }));
    const dialog = screen.getByRole('dialog', { name: '¿Marcar como lista para recoger?' });
    expect(dialog).toHaveTextContent('Reserva de «Libro r1» de Ana en Librería Centro.');
    await user.click(within(dialog).getByRole('button', { name: 'Marcar lista' }));
    expect(service.markReady).toHaveBeenCalledWith('r1');
    expect(
      await screen.findByText('La reserva de «Libro r1» está lista para recoger.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(service.listReservations).toHaveBeenCalledTimes(2));
  });

  it('un 409 INVALID_TRANSITION se muestra en el diálogo', async () => {
    const user = userEvent.setup();
    service.markPickedUp.mockRejectedValue(
      new ApiError(409, 'INVALID_TRANSITION', 'La reserva no admite ese cambio de estado'),
    );
    renderPage();
    await user.click((await rowOf('Libro r2')).getByRole('button', { name: /^Marcar recogida/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Marcar recogida' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('no admite ese cambio');
  });

  it('filtra por estado y tienda', async () => {
    const user = userEvent.setup();
    renderPage();
    await rowOf('Libro r1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'pending');
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Establecimiento' }),
      's1',
    );
    await waitFor(() => expect(currentSearch).toBe('?status=pending&store_id=s1'));
    await waitFor(() =>
      expect(service.listReservations).toHaveBeenLastCalledWith({
        status: 'pending',
        page: 1,
        store_id: 's1',
      }),
    );
    expect(listStores).toHaveBeenCalledWith({ limit: 50 });
  });
});
