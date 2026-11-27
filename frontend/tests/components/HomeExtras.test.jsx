// Pruebas de las piezas nuevas de la portada y del pie: chips de géneros, "Cómo funciona" y
// SiteFooter.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/services/configService.js', () => ({
  getConfig: vi.fn(),
  listGenres: vi.fn(),
}));

const { useAuth } = await import('../../src/hooks/useAuth.js');
const { getConfig, listGenres } = await import('../../src/services/configService.js');
const { GenreChips } = await import('../../src/components/GenreChips.jsx');
const { HowItWorks } = await import('../../src/components/HowItWorks.jsx');
const { SiteFooter } = await import('../../src/components/SiteFooter.jsx');

const renderAt = (ui, url = '/') =>
  render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null, status: 'anonymous' });
  getConfig.mockResolvedValue({ currency: 'MXN', pending_ttl_days: 7, pickup_ttl_days: 3 });
  listGenres.mockResolvedValue([
    { id: 'g1', name: 'Manga', slug: 'manga' },
    { id: 'g2', name: 'Novela', slug: 'novela' },
  ]);
});

describe('GenreChips', () => {
  it('enlaza cada género conservando la búsqueda y marca el activo', async () => {
    renderAt(<GenreChips />, '/?q=dune&genre=novela&page=3');
    const nav = await screen.findByRole('navigation', { name: 'Filtrar por género' });
    expect(within(nav).getByRole('link', { name: 'Manga' })).toHaveAttribute(
      'href',
      '/?q=dune&genre=manga',
    );
    expect(within(nav).getByRole('link', { name: 'Novela' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/?q=dune');
  });

  it('no se muestra si los géneros no cargan', async () => {
    listGenres.mockRejectedValue(new Error('Sin conexión'));
    const { container } = renderAt(<GenreChips />);
    await vi.waitFor(() => expect(listGenres).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('HowItWorks', () => {
  it('explica los tres pasos con los plazos de la configuración', async () => {
    renderAt(<HowItWorks />);
    const section = screen.getByRole('region', { name: 'Cómo funciona' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
    expect(await within(section).findByText(/hasta 7 días/)).toBeInTheDocument();
    expect(within(section).getByText(/tienes 3 días/)).toBeInTheDocument();
  });

  it('baja hasta la sección al llegar con #como-funciona', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderAt(<HowItWorks />, '/#como-funciona');
    expect(scrollIntoView).toHaveBeenCalled();
    delete Element.prototype.scrollIntoView;
  });
});

describe('SiteFooter', () => {
  it('sin sesión ofrece entrar y crear cuenta, y enlaza a cómo reservar', () => {
    renderAt(<SiteFooter />);
    const account = screen.getByRole('navigation', { name: 'Cuenta' });
    expect(within(account).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: 'Cómo reservar' })).toHaveAttribute(
      'href',
      '/#como-funciona',
    );
  });

  it('con sesión enlaza a la cuenta; al administrador, a la gestión de reservas', () => {
    useAuth.mockReturnValue({ user: { name: 'Ana', role: 'user' }, status: 'authenticated' });
    const { unmount } = renderAt(<SiteFooter />);
    const mine = screen.getByRole('navigation', { name: 'Mi cuenta' });
    expect(within(mine).getByRole('link', { name: 'Mis reservas' })).toBeInTheDocument();
    unmount();

    useAuth.mockReturnValue({ user: { name: 'Admin', role: 'admin' }, status: 'authenticated' });
    renderAt(<SiteFooter />);
    const admin = screen.getByRole('navigation', { name: 'Mi cuenta' });
    expect(within(admin).getByRole('link', { name: 'Reservas' })).toHaveAttribute(
      'href',
      '/admin/reservations',
    );
  });
});
