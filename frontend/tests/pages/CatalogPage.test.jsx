import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/booksService.js', () => ({ listBooks: vi.fn(), getBook: vi.fn() }));
// BookCard muestra el corazón de favoritos, que depende de la sesión: aquí, un visitante.
vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ status: 'anonymous', user: null }),
}));
vi.mock('../../src/services/configService.js', () => ({
  getConfig: vi.fn(),
  listGenres: vi.fn(),
}));

const { listBooks } = await import('../../src/services/booksService.js');
const { getConfig, listGenres } = await import('../../src/services/configService.js');
const { CatalogPage } = await import('../../src/pages/CatalogPage.jsx');

const book = (n, genre = { id: 'g1', name: 'Novela', slug: 'novela' }) => ({
  id: `b${n}`,
  title: `Libro ${n}`,
  author: `Autor ${n}`,
  isbn: '9780307474728',
  genre,
  price_cents: 1999,
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
function LocationProbe() {
  currentSearch = useLocation().search;
  return null;
}

function renderCatalog(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CatalogPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listBooks.mockReset();
  getConfig.mockResolvedValue({ currency: 'EUR' });
  listGenres.mockResolvedValue([
    { id: 'g1', name: 'Novela', slug: 'novela' },
    { id: 'g2', name: 'Poesía', slug: 'poesia' },
  ]);
});

describe('CatalogPage', () => {
  it('muestra el listado con título, autor, género y precio', async () => {
    listBooks.mockResolvedValue(page([book(1), book(2)]));
    renderCatalog();
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    expect(first.getByRole('link', { name: 'Libro 1' })).toHaveAttribute('href', '/books/b1');
    expect(first.getByText('Autor 1')).toBeInTheDocument();
    expect(first.getByText('Novela')).toBeInTheDocument();
    await waitFor(() => expect(first.getByText(/19,99/)).toBeInTheDocument());
    expect(screen.getByText('2 libros')).toBeInTheDocument();
  });

  it('la búsqueda actualiza la URL tras la espera y combina con el género', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(page([book(1)]));
    renderCatalog('/?genre=novela');
    await screen.findAllByRole('article');

    await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'cien años');
    await waitFor(() => expect(currentSearch).toBe('?genre=novela&q=cien+a%C3%B1os'));
    await waitFor(() =>
      expect(listBooks).toHaveBeenLastCalledWith({ q: 'cien años', genre: 'novela', page: 1 }),
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Género' }), 'poesia');
    await waitFor(() => expect(currentSearch).toBe('?genre=poesia&q=cien+a%C3%B1os'));
  });

  it('sin resultados muestra el estado vacío y "Limpiar filtros" vacía la URL', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(page([]));
    renderCatalog('/?q=zzz&genre=novela');
    expect(await screen.findByText('No hay libros que coincidan')).toBeInTheDocument();

    listBooks.mockResolvedValue(page([book(1)]));
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(currentSearch).toBe(''));
    expect(await screen.findByRole('link', { name: 'Libro 1' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('');
  });

  it('pagina con la URL', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(page([book(1)], { total: 25, total_pages: 2 }));
    renderCatalog();
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(currentSearch).toBe('?page=2'));
  });

  it('muestra el error de la API con la opción de reintentar', async () => {
    const user = userEvent.setup();
    listBooks.mockRejectedValueOnce(new Error('No se pudo conectar con el servidor'));
    listBooks.mockResolvedValue(page([book(1)]));
    renderCatalog();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: 'Libro 1' })).toBeInTheDocument();
  });
});
