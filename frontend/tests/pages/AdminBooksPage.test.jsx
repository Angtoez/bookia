import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/booksService.js', () => ({
  listBooks: vi.fn(),
  getBookDeletionImpact: vi.fn(),
  deleteBook: vi.fn(),
}));
vi.mock('../../src/services/configService.js', () => ({ getConfig: vi.fn() }));

const booksService = await import('../../src/services/booksService.js');
const { getConfig } = await import('../../src/services/configService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { AdminBooksPage } = await import('../../src/pages/admin/AdminBooksPage.jsx');

const book = (n) => ({
  id: `b${n}`,
  title: `Libro ${n}`,
  author: `Autor ${n}`,
  isbn: '9780307474728',
  genre: null,
  price_cents: 1850,
});
const page = (items, extra = {}) => ({
  items,
  page: 1,
  limit: 20,
  total: items.length,
  total_pages: 1,
  ...extra,
});

let currentSearch = '';
function Probe() {
  currentSearch = useLocation().search;
  return null;
}

function renderAt(url = '/admin/books', state) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: url.split('?')[0],
          search: url.split('?')[1] ? `?${url.split('?')[1]}` : '',
          state,
        },
      ]}
    >
      <Routes>
        <Route
          path="/admin/books"
          element={
            <>
              <AdminBooksPage />
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

describe('AdminBooksPage', () => {
  it('muestra la tabla con título, autor, ISBN y precio, y el aviso recibido', async () => {
    booksService.listBooks.mockResolvedValue(page([book(1), book(2)]));
    renderAt('/admin/books', { notice: 'Se ha creado «Libro 2».' });
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);
    const first = within(rows[1]);
    expect(first.getByRole('rowheader', { name: 'Libro 1' })).toBeInTheDocument();
    expect(first.getByText('Autor 1')).toBeInTheDocument();
    expect(first.getByText('9780307474728')).toBeInTheDocument();
    await waitFor(() => expect(first.getByText(/18,50/)).toBeInTheDocument());
    expect(first.getByRole('link', { name: 'Editar «Libro 1»' })).toHaveAttribute(
      'href',
      '/admin/books/b1/edit',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Se ha creado «Libro 2».');
  });

  it('eliminar avisa del impacto, borra al confirmar y recarga', async () => {
    const user = userEvent.setup();
    booksService.listBooks.mockResolvedValue(page([book(1), book(2)]));
    booksService.getBookDeletionImpact.mockResolvedValue({
      stores: 3,
      active_reservations: 1,
      favorites: 0,
    });
    booksService.deleteBook.mockResolvedValue(null);
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Eliminar «Libro 1»' }));

    const dialog = await screen.findByRole('dialog', { name: '¿Eliminar «Libro 1»?' });
    expect(dialog).toHaveTextContent('Se quitará de 3 establecimientos.');
    expect(dialog).toHaveTextContent('Se cancelará 1 reserva activa.');
    expect(dialog).not.toHaveTextContent('favoritos');

    booksService.listBooks.mockResolvedValue(page([book(2)]));
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(booksService.deleteBook).toHaveBeenCalledWith('b1');
    expect(await screen.findByText('Se ha eliminado «Libro 1».')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'Libro 1' })).toBeNull());
  });

  it('cancelar no borra nada', async () => {
    const user = userEvent.setup();
    booksService.listBooks.mockResolvedValue(page([book(1)]));
    booksService.getBookDeletionImpact.mockResolvedValue({
      stores: 1,
      active_reservations: 0,
      favorites: 2,
    });
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Eliminar «Libro 1»' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Se quitará de 1 establecimiento.');
    expect(dialog).toHaveTextContent('Desaparecerá de 2 listas de favoritos.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(booksService.deleteBook).not.toHaveBeenCalled();
  });

  it('si no se puede consultar el impacto, no deja confirmar', async () => {
    const user = userEvent.setup();
    booksService.listBooks.mockResolvedValue(page([book(1)]));
    booksService.getBookDeletionImpact.mockRejectedValue(
      new ApiError(500, 'INTERNAL_ERROR', 'Ha ocurrido un error inesperado'),
    );
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Eliminar «Libro 1»' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('error inesperado');
    expect(within(dialog).getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  });

  it('borrar el último libro de una página vuelve a la anterior', async () => {
    const user = userEvent.setup();
    booksService.listBooks.mockResolvedValue(
      page([book(21)], { page: 2, total: 21, total_pages: 2 }),
    );
    booksService.getBookDeletionImpact.mockResolvedValue({
      stores: 0,
      active_reservations: 0,
      favorites: 0,
    });
    booksService.deleteBook.mockResolvedValue(null);
    renderAt('/admin/books?page=2');
    await user.click(await screen.findByRole('button', { name: 'Eliminar «Libro 21»' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'No está en ningún establecimiento.',
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(currentSearch).toBe(''));
  });

  it('la búsqueda va a la URL', async () => {
    const user = userEvent.setup();
    booksService.listBooks.mockResolvedValue(page([]));
    renderAt();
    expect(await screen.findByText('Todavía no hay libros.')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'borges');
    await waitFor(() => expect(currentSearch).toBe('?q=borges'));
    await waitFor(() =>
      expect(booksService.listBooks).toHaveBeenLastCalledWith({ q: 'borges', page: 1 }),
    );
  });
});
