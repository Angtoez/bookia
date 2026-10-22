import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/storesService.js', () => ({
  getStore: vi.fn(),
  listStoreBooks: vi.fn(),
  addStoreBook: vi.fn(),
  updateStoreBook: vi.fn(),
  removeStoreBook: vi.fn(),
}));
vi.mock('../../src/services/booksService.js', () => ({ listBooks: vi.fn() }));
vi.mock('../../src/services/configService.js', () => ({ getConfig: vi.fn() }));

const storesService = await import('../../src/services/storesService.js');
const { listBooks } = await import('../../src/services/booksService.js');
const { getConfig } = await import('../../src/services/configService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { StoreInventoryPage } = await import('../../src/pages/admin/StoreInventoryPage.jsx');

const item = (n, extra = {}) => ({
  book_id: `b${n}`,
  title: `Libro ${n}`,
  author: `Autor ${n}`,
  isbn: '9780307474728',
  stock: 5,
  reserved_count: 2,
  available: 3,
  store_price_cents: 1850,
  effective_price_cents: 1850,
  ...extra,
});
const page = (items) => ({ items, page: 1, limit: 20, total: items.length, total_pages: 1 });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/stores/s1/books']}>
      <Routes>
        <Route path="/admin/stores/:id/books" element={<StoreInventoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfig.mockResolvedValue({ currency: 'MXN' });
  storesService.getStore.mockResolvedValue({
    id: 's1',
    name: 'Librería Centro',
    address: 'Calle 1',
  });
  storesService.listStoreBooks.mockResolvedValue(
    page([item(1), item(2, { store_price_cents: null })]),
  );
});

describe('StoreInventoryPage', () => {
  it('muestra stock, reservadas, disponibles y precios', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Inventario de Librería Centro' }),
    ).toBeInTheDocument();
    const row = within(screen.getByRole('rowheader', { name: /Libro 1/ }).closest('tr'));
    expect(row.getByLabelText('Stock de «Libro 1»')).toHaveValue('5');
    expect(row.getByLabelText('Precio en la tienda de «Libro 1»')).toHaveValue('18,50');
    expect(row.getByText('2')).toBeInTheDocument();
    expect(row.getByText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('Precio en la tienda de «Libro 2»')).toHaveValue('');
    expect(storesService.listStoreBooks).toHaveBeenCalledWith('s1', { page: 1 });
  });

  it('edita el stock en línea y envía solo ese cambio', async () => {
    const user = userEvent.setup();
    storesService.updateStoreBook.mockResolvedValue(item(1, { stock: 8 }));
    renderPage();
    const stock = await screen.findByLabelText('Stock de «Libro 1»');
    const save = screen.getByRole('button', { name: 'Guardar «Libro 1»' });
    expect(save).toBeDisabled();
    await user.clear(stock);
    await user.type(stock, '8');
    await user.click(save);
    expect(storesService.updateStoreBook).toHaveBeenCalledWith('s1', 'b1', { stock: 8 });
    expect(await screen.findByText('Se ha actualizado «Libro 1».')).toBeInTheDocument();
    await waitFor(() => expect(storesService.listStoreBooks).toHaveBeenCalledTimes(2));
  });

  it('un precio vacío envía null para usar el de referencia', async () => {
    const user = userEvent.setup();
    storesService.updateStoreBook.mockResolvedValue(item(1, { store_price_cents: null }));
    renderPage();
    await user.clear(await screen.findByLabelText('Precio en la tienda de «Libro 1»'));
    await user.click(screen.getByRole('button', { name: 'Guardar «Libro 1»' }));
    expect(storesService.updateStoreBook).toHaveBeenCalledWith('s1', 'b1', {
      store_price_cents: null,
    });
  });

  it('muestra en la fila el 409 de la API y valida el stock en el cliente', async () => {
    const user = userEvent.setup();
    storesService.updateStoreBook.mockRejectedValue(
      new ApiError(
        409,
        'STOCK_BELOW_RESERVED',
        'Hay 2 unidades reservadas; el stock no puede ser menor',
      ),
    );
    renderPage();
    const stock = await screen.findByLabelText('Stock de «Libro 1»');
    await user.clear(stock);
    await user.type(stock, '-1');
    await user.click(screen.getByRole('button', { name: 'Guardar «Libro 1»' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Indica un número entero');
    expect(storesService.updateStoreBook).not.toHaveBeenCalled();

    await user.clear(stock);
    await user.type(stock, '1');
    await user.click(screen.getByRole('button', { name: 'Guardar «Libro 1»' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Hay 2 unidades reservadas; el stock no puede ser menor',
    );
    expect(stock).toHaveValue('1');
  });

  it('añade un libro con BookPicker', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(
      page([
        { id: 'b1', title: 'Libro 1', author: 'Autor 1', isbn: '1' },
        { id: 'b9', title: 'Rayuela', author: 'Julio Cortázar', isbn: '9788437604947' },
      ]),
    );
    storesService.addStoreBook.mockResolvedValue(item(9, { title: 'Rayuela' }));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Añadir libro' }));
    await user.type(screen.getByRole('searchbox', { name: /buscar libro/i }), 'ra');
    const option = await screen.findByRole('button', { name: /Rayuela/ });
    // Los libros que ya están en el inventario no se pueden elegir.
    expect(screen.getByRole('button', { name: /Ya está en el inventario/ })).toBeDisabled();
    expect(listBooks).toHaveBeenLastCalledWith({ q: 'ra', limit: 8 });

    await user.click(option);
    await user.clear(screen.getByLabelText(/^unidades/i));
    await user.type(screen.getByLabelText(/^unidades/i), '4');
    await user.type(screen.getByLabelText(/^precio en la tienda \(MXN\)/i), '15');
    await user.click(screen.getByRole('button', { name: 'Añadir al inventario' }));
    expect(storesService.addStoreBook).toHaveBeenCalledWith('s1', {
      book_id: 'b9',
      stock: 4,
      store_price_cents: 1500,
    });
    expect(await screen.findByText('Se ha añadido «Rayuela» al inventario.')).toBeInTheDocument();
  });

  it('un 409 ALREADY_ASSOCIATED se muestra en el formulario de alta', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(page([{ id: 'b9', title: 'Rayuela', author: 'J. C.', isbn: '1' }]));
    storesService.addStoreBook.mockRejectedValue(
      new ApiError(409, 'ALREADY_ASSOCIATED', 'El libro ya está asociado a este establecimiento'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Añadir libro' }));
    await user.type(screen.getByRole('searchbox', { name: /buscar libro/i }), 'ra');
    await user.click(await screen.findByRole('button', { name: /Rayuela/ }));
    await user.click(screen.getByRole('button', { name: 'Añadir al inventario' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya está asociado');
  });

  it('quitar con reservas activas muestra el 409 y no deja reintentar', async () => {
    const user = userEvent.setup();
    storesService.removeStoreBook.mockRejectedValue(
      new ApiError(409, 'HAS_ACTIVE_RESERVATIONS', 'No se puede desasociar: hay reservas activas'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Quitar «Libro 1»' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Quitar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('hay reservas activas');
    expect(within(dialog).getByRole('button', { name: 'Quitar' })).toBeDisabled();
  });

  it('quitar sin reservas recarga la lista', async () => {
    const user = userEvent.setup();
    storesService.removeStoreBook.mockResolvedValue(null);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Quitar «Libro 2»' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitar' }),
    );
    expect(storesService.removeStoreBook).toHaveBeenCalledWith('s1', 'b2');
    expect(await screen.findByText('Se ha quitado «Libro 2» del inventario.')).toBeInTheDocument();
  });

  it('una tienda que no existe muestra NotFound', async () => {
    storesService.getStore.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No encontrado'));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'No encontrado' })).toBeInTheDocument();
  });
});
