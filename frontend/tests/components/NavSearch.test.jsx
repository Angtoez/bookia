import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NavSearch } from '../../src/components/NavSearch.jsx';

let current = '';
function LocationProbe() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    current = `${pathname}${search}`;
  }, [pathname, search]);
  return null;
}

function renderSearch(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <NavSearch />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NavSearch', () => {
  it('la lupa despliega el campo con el foco y Esc lo pliega', async () => {
    const user = userEvent.setup();
    renderSearch('/');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buscar libros' }));
    expect(screen.getByRole('searchbox', { name: 'Buscar por título o autor' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar libros' })).toHaveFocus();
  });

  it('en el catálogo filtra tras la espera y conserva el género', async () => {
    const user = userEvent.setup();
    renderSearch('/?genre=novela');
    await user.click(screen.getByRole('button', { name: 'Buscar libros' }));
    await user.type(screen.getByRole('searchbox'), 'cien años');
    await waitFor(() => expect(current).toBe('/?genre=novela&q=cien+a%C3%B1os'));
  });

  it('desde otra página, Enter lleva al catálogo con la búsqueda', async () => {
    const user = userEvent.setup();
    renderSearch('/me/favorites');
    await user.click(screen.getByRole('button', { name: 'Buscar libros' }));
    await user.type(screen.getByRole('searchbox'), 'Naruto{Enter}');
    expect(current).toBe('/?q=Naruto');
  });

  it('se pliega al salir del catálogo con una búsqueda y tiene botón de cerrar', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/?q=dune']}>
        <NavSearch />
        <Link to="/books/b1">Abrir libro</Link>
      </MemoryRouter>,
    );
    expect(screen.getByRole('searchbox')).toHaveValue('dune');
    await user.click(screen.getByRole('link', { name: 'Abrir libro' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buscar libros' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar la búsqueda' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar libros' })).toHaveFocus();
  });

  it('con una búsqueda en la URL aparece desplegado y con su texto', () => {
    renderSearch('/?q=dune');
    expect(screen.getByRole('searchbox')).toHaveValue('dune');
  });
});
