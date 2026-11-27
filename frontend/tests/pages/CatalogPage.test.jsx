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
// Las secciones de la portada tienen sus propias pruebas (HomeShelves.test.jsx).
vi.mock('../../src/components/HomeShelves.jsx', () => ({
  TopRatedShelf: () => <p>Sección: mejor valorados</p>,
  ComicsMangaShelf: () => <p>Sección: cómics y manga</p>,
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

  it('sin filtros es la portada (banner, secciones y catálogo) y con filtros no', async () => {
    listBooks.mockResolvedValue(page([book(1)]));
    const { unmount } = renderCatalog();
    // El título principal está en el banner y ya no hay banda de bienvenida.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Bookia: descubre/);
    expect(screen.queryByText('Descubre todos los libros de Bookia')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Destacados' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getByText('Sección: mejor valorados')).toBeInTheDocument();
    expect(screen.getByText('Sección: cómics y manga')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Todos los libros | Explora la colección' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('article')).toHaveLength(1);
    unmount();

    renderCatalog('/?genre=novela');
    await screen.findAllByRole('article');
    expect(screen.queryByRole('region', { name: 'Destacados' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sección: mejor valorados')).not.toBeInTheDocument();
  });

  it('filtra con q y genre de la URL, con el género como título y la búsqueda junto al total', async () => {
    const user = userEvent.setup();
    listBooks.mockResolvedValue(page([book(1)]));
    renderCatalog('/?genre=poesia&q=cien+a%C3%B1os');
    await screen.findAllByRole('article');
    expect(listBooks).toHaveBeenLastCalledWith({ q: 'cien años', genre: 'poesia', page: 1 });
    expect(await screen.findByRole('heading', { level: 1, name: 'Poesía' })).toBeInTheDocument();
    expect(screen.getByText('1 libro para «cien años»')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver todos los géneros' }));
    await waitFor(() => expect(currentSearch).toBe('?q=cien+a%C3%B1os'));
    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument();
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
