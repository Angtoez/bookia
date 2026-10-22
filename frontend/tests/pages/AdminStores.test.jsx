import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/storesService.js', () => ({
  listStores: vi.fn(),
  getStore: vi.fn(),
  createStore: vi.fn(),
  updateStore: vi.fn(),
  getStoreDeletionImpact: vi.fn(),
  deleteStore: vi.fn(),
}));

const storesService = await import('../../src/services/storesService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { AdminStoresPage } = await import('../../src/pages/admin/AdminStoresPage.jsx');
const { StoreFormPage } = await import('../../src/pages/admin/StoreFormPage.jsx');

const store = (n, extra = {}) => ({
  id: `s${n}`,
  name: `Tienda ${n}`,
  address: `Calle ${n}`,
  opening_hours: 'L–V 9–19',
  phone: null,
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

function NoticeProbe() {
  return <p>Listado: {useLocation().state?.notice}</p>;
}

function renderAt(url, listElement = <AdminStoresPage />) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/stores" element={listElement} />
        <Route path="/admin/stores/new" element={<StoreFormPage />} />
        <Route path="/admin/stores/:id/edit" element={<StoreFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('AdminStoresPage', () => {
  it('lista las tiendas con enlaces a inventario y edición', async () => {
    storesService.listStores.mockResolvedValue(
      page([store(1, { phone: '776 000 0001' }), store(2)]),
    );
    renderAt('/admin/stores');
    const row = within((await screen.findByRole('rowheader', { name: 'Tienda 1' })).closest('tr'));
    expect(row.getByText('776 000 0001')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'Inventario de «Tienda 1»' })).toHaveAttribute(
      'href',
      '/admin/stores/s1/books',
    );
    expect(row.getByRole('link', { name: 'Editar «Tienda 1»' })).toHaveAttribute(
      'href',
      '/admin/stores/s1/edit',
    );
  });

  it('al eliminar avisa de los libros y reservas afectados', async () => {
    const user = userEvent.setup();
    storesService.listStores.mockResolvedValue(page([store(1), store(2)]));
    storesService.getStoreDeletionImpact.mockResolvedValue({ books: 4, active_reservations: 2 });
    storesService.deleteStore.mockResolvedValue(null);
    renderAt('/admin/stores');
    await user.click(await screen.findByRole('button', { name: 'Eliminar «Tienda 1»' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Eliminar «Tienda 1»?' });
    expect(dialog).toHaveTextContent('Se quitarán 4 libros de su inventario');
    expect(dialog).toHaveTextContent('Se cancelarán 2 reservas activas.');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(storesService.deleteStore).toHaveBeenCalledWith('s1');
    expect(await screen.findByText('Se ha eliminado «Tienda 1».')).toBeInTheDocument();
    await waitFor(() => expect(storesService.listStores).toHaveBeenCalledTimes(2));
  });
});

describe('StoreFormPage', () => {
  it('crea una tienda; el teléfono vacío se envía como null', async () => {
    const user = userEvent.setup();
    storesService.createStore.mockResolvedValue(store(3, { name: 'Nueva' }));
    renderAt('/admin/stores/new', <NoticeProbe />);
    await user.type(screen.getByLabelText(/^nombre/i), 'Nueva');
    await user.type(screen.getByLabelText(/^dirección/i), 'Calle 3');
    await user.type(screen.getByLabelText(/^horario/i), 'L–V 9–19');
    await user.click(screen.getByRole('button', { name: 'Crear establecimiento' }));
    expect(await screen.findByText('Listado: Se ha creado «Nueva».')).toBeInTheDocument();
    expect(storesService.createStore).toHaveBeenCalledWith({
      name: 'Nueva',
      address: 'Calle 3',
      opening_hours: 'L–V 9–19',
      phone: null,
    });
  });

  it('valida obligatorios y el teléfono, y muestra los details de la API', async () => {
    const user = userEvent.setup();
    storesService.createStore.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
        { field: 'address', message: 'La dirección es demasiado larga' },
      ]),
    );
    renderAt('/admin/stores/new', <NoticeProbe />);
    await user.type(screen.getByLabelText(/^teléfono/i), 'abc');
    await user.click(screen.getByRole('button', { name: 'Crear establecimiento' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La dirección es obligatoria')).toBeInTheDocument();
    expect(screen.getByText(/solo admite dígitos/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^nombre/i), 'N');
    await user.type(screen.getByLabelText(/^dirección/i), 'D');
    await user.type(screen.getByLabelText(/^horario/i), 'H');
    await user.clear(screen.getByLabelText(/^teléfono/i));
    await user.click(screen.getByRole('button', { name: 'Crear establecimiento' }));
    expect(await screen.findByText('La dirección es demasiado larga')).toBeInTheDocument();
  });

  it('edita enviando solo los cambios', async () => {
    const user = userEvent.setup();
    storesService.getStore.mockResolvedValue(store(1));
    storesService.updateStore.mockResolvedValue(store(1, { phone: '555' }));
    renderAt('/admin/stores/s1/edit', <NoticeProbe />);
    await user.type(await screen.findByLabelText(/^teléfono/i), '555');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Listado: Se ha actualizado «Tienda 1».')).toBeInTheDocument();
    expect(storesService.updateStore).toHaveBeenCalledWith('s1', { phone: '555' });
  });
});
