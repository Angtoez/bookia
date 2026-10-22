import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/auditLogsService.js', () => ({ listAuditLogs: vi.fn() }));

const { listAuditLogs } = await import('../../src/services/auditLogsService.js');
const { AuditLogPage } = await import('../../src/pages/admin/AuditLogPage.jsx');

const log = (id, extra = {}) => ({
  id,
  user: { id: 'u1', name: 'Ana Admin' },
  action: 'update',
  entity_type: 'book',
  entity_id: 'b1',
  entity_label: 'Rayuela',
  before: { _id: 'b1', title: 'Rayuela', price_cents: 1850, updated_at: '2026-10-01' },
  after: { _id: 'b1', title: 'Rayuela', price_cents: 2000, updated_at: '2026-10-02' },
  created_at: '2026-10-22T10:00:00.000Z',
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

let currentSearch = '';
function Probe() {
  currentSearch = useLocation().search;
  return null;
}

function renderPage(url = '/admin/audit') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/admin/audit"
          element={
            <>
              <AuditLogPage />
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
  listAuditLogs.mockResolvedValue(
    page([
      log('l1'),
      log('l2', {
        user: null,
        action: 'status_change',
        entity_type: 'reservation',
        entity_label: 'Pedro Páramo',
        before: { status: 'pending' },
        after: { status: 'expired' },
      }),
      log('l3', {
        action: 'create',
        entity_type: 'store',
        entity_label: 'Tienda nueva',
        before: null,
        after: { name: 'Tienda nueva', phone: null },
      }),
    ]),
  );
});

const rowOf = async (label) =>
  within((await screen.findByRole('rowheader', { name: label })).closest('tr'));

describe('AuditLogPage', () => {
  it('muestra fecha, usuario o "Sistema", acción, tipo y elemento', async () => {
    renderPage();
    const book = await rowOf('Rayuela');
    expect(book.getByText('Ana Admin')).toBeInTheDocument();
    expect(book.getByText('Modificación')).toBeInTheDocument();
    expect(book.getByText('Libro')).toBeInTheDocument();
    expect(book.getByText(/2026/)).toBeInTheDocument();
    const system = await rowOf('Pedro Páramo');
    expect(system.getByText('Sistema')).toBeInTheDocument();
    expect(system.getByText('Cambio de estado')).toBeInTheDocument();
    expect(system.getByText('Reserva')).toBeInTheDocument();
  });

  it('al desplegar una fila muestra solo los campos que cambian', async () => {
    const user = userEvent.setup();
    renderPage();
    const button = (await rowOf('Rayuela')).getByRole('button', { name: /Ver cambios/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    expect(within(detail).getByText('price_cents')).toBeInTheDocument();
    expect(within(detail).getByText('1850')).toBeInTheDocument();
    expect(within(detail).getByText('2000')).toBeInTheDocument();
    // Ni los campos sin cambios ni los técnicos.
    expect(within(detail).queryByText('title')).toBeNull();
    expect(within(detail).queryByText('updated_at')).toBeNull();
    await user.click(button);
    expect(document.getElementById(button.getAttribute('aria-controls'))).toBeNull();
  });

  it('en un alta lista todos los campos nuevos', async () => {
    const user = userEvent.setup();
    renderPage();
    const button = (await rowOf('Tienda nueva')).getByRole('button', { name: /Ver cambios/ });
    await user.click(button);
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    expect(within(detail).getByText('name')).toBeInTheDocument();
    expect(within(detail).getByText('phone')).toBeInTheDocument();
    expect(within(detail).getByText('—')).toBeInTheDocument();
  });

  it('filtra por tipo con la URL e ignora tipos desconocidos', async () => {
    const user = userEvent.setup();
    renderPage('/admin/audit?entity_type=genre');
    await rowOf('Rayuela');
    expect(listAuditLogs).toHaveBeenCalledWith({ entity_type: undefined, page: 1 });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'user');
    await waitFor(() => expect(currentSearch).toBe('?entity_type=user'));
    await waitFor(() =>
      expect(listAuditLogs).toHaveBeenLastCalledWith({ entity_type: 'user', page: 1 }),
    );
  });
});
