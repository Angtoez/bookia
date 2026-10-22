import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/booksService.js', () => ({
  createBook: vi.fn(),
  updateBook: vi.fn(),
  getBook: vi.fn(),
}));
vi.mock('../../src/services/configService.js', () => ({
  getConfig: vi.fn(),
  listGenres: vi.fn(),
}));

const booksService = await import('../../src/services/booksService.js');
const { getConfig, listGenres } = await import('../../src/services/configService.js');
const { ApiError } = await import('../../src/services/apiClient.js');
const { BookFormPage } = await import('../../src/pages/admin/BookFormPage.jsx');

const existing = {
  id: 'b1',
  title: 'Rayuela',
  author: 'Julio Cortázar',
  isbn: '9788437604947',
  genre: { id: 'g1', name: 'Novela', slug: 'novela' },
  price_cents: 1850,
  description: '',
  publisher: 'Cátedra',
  publication_year: 1963,
  stores: [],
};

function AdminBooksProbe() {
  return <p>Listado: {useLocation().state?.notice}</p>;
}

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/books" element={<AdminBooksProbe />} />
        <Route path="/admin/books/new" element={<BookFormPage />} />
        <Route path="/admin/books/:id/edit" element={<BookFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillRequired(user) {
  await user.type(screen.getByLabelText(/^título/i), 'Rayuela');
  await user.type(screen.getByLabelText(/^autor/i), 'Julio Cortázar');
  await user.selectOptions(await screen.findByLabelText(/^género/i), 'g1');
  await user.type(screen.getByLabelText(/^isbn/i), '978-84-376-0494-7');
  await user.type(screen.getByLabelText(/^precio/i), '18,50');
}

beforeEach(() => {
  vi.clearAllMocks();
  getConfig.mockResolvedValue({ currency: 'MXN' });
  listGenres.mockResolvedValue([
    { id: 'g1', name: 'Novela', slug: 'novela' },
    { id: 'g2', name: 'Poesía', slug: 'poesia' },
  ]);
});

describe('BookFormPage (alta)', () => {
  it('convierte el precio a céntimos, crea el libro y vuelve al listado con un aviso', async () => {
    const user = userEvent.setup();
    booksService.createBook.mockResolvedValue({ ...existing });
    renderAt('/admin/books/new');
    expect(await screen.findByLabelText(/precio de referencia \(MXN\)/i)).toBeInTheDocument();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));

    expect(await screen.findByText('Listado: Se ha creado «Rayuela».')).toBeInTheDocument();
    expect(booksService.createBook).toHaveBeenCalledWith({
      title: 'Rayuela',
      author: 'Julio Cortázar',
      genre_id: 'g1',
      isbn: '978-84-376-0494-7',
      price_cents: 1850,
      publisher: '',
      publication_year: null,
      description: '',
    });
  });

  it('valida en el cliente y no envía nada', async () => {
    const user = userEvent.setup();
    renderAt('/admin/books/new');
    await user.type(await screen.findByLabelText(/^isbn/i), '123');
    await user.type(screen.getByLabelText(/^precio/i), '-3');
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));
    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument();
    expect(screen.getByText(/ISBN no válido/)).toBeInTheDocument();
    expect(screen.getByText(/importe mayor o igual que 0/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^título/i)).toHaveFocus();
    expect(booksService.createBook).not.toHaveBeenCalled();
  });

  it('muestra los details de la API en cada campo e ISBN_TAKEN en el ISBN', async () => {
    const user = userEvent.setup();
    booksService.createBook
      .mockRejectedValueOnce(
        new ApiError(400, 'VALIDATION_ERROR', 'Datos no válidos', [
          { field: 'price_cents', message: 'Debe ser un número entero de céntimos' },
          { field: 'genre_id', message: 'El género no existe' },
        ]),
      )
      .mockRejectedValueOnce(new ApiError(409, 'ISBN_TAKEN', 'Ya existe un libro con ese ISBN'));
    renderAt('/admin/books/new');
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Crear libro' }));
    expect(await screen.findByText('Debe ser un número entero de céntimos')).toBeInTheDocument();
    expect(screen.getByText('El género no existe')).toBeInTheDocument();
    expect(screen.getByLabelText(/^género/i)).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Crear libro' }));
    expect(await screen.findByText('Ya existe un libro con ese ISBN')).toBeInTheDocument();
    expect(screen.getByLabelText(/^isbn/i)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('BookFormPage (edición)', () => {
  it('carga el libro y envía solo los campos que cambian', async () => {
    const user = userEvent.setup();
    booksService.getBook.mockResolvedValue(existing);
    booksService.updateBook.mockResolvedValue({ ...existing, price_cents: 2000 });
    renderAt('/admin/books/b1/edit');
    const price = await screen.findByLabelText(/^precio/i);
    expect(price).toHaveValue('18,50');
    expect(screen.getByLabelText(/^año/i)).toHaveValue('1963');

    await user.clear(price);
    await user.type(price, '20');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Listado: Se ha actualizado «Rayuela».')).toBeInTheDocument();
    expect(booksService.updateBook).toHaveBeenCalledWith('b1', { price_cents: 2000 });
  });

  it('sin cambios no llama a la API', async () => {
    const user = userEvent.setup();
    booksService.getBook.mockResolvedValue(existing);
    renderAt('/admin/books/b1/edit');
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Listado: No había cambios que guardar.')).toBeInTheDocument();
    expect(booksService.updateBook).not.toHaveBeenCalled();
  });

  it('un libro que no existe muestra NotFound', async () => {
    booksService.getBook.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Libro no encontrado'));
    renderAt('/admin/books/zz/edit');
    expect(await screen.findByRole('heading', { name: 'No encontrado' })).toBeInTheDocument();
  });
});
