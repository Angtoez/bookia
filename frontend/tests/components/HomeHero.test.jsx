import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeHero } from '../../src/components/HomeHero.jsx';

const renderHero = () =>
  render(
    <MemoryRouter>
      <HomeHero />
    </MemoryRouter>,
  );

const currentSlide = () => screen.getByRole('group', { name: /de 3$/ });

afterEach(() => vi.useRealTimers());

describe('HomeHero', () => {
  it('cambia de diapositiva con las flechas y los puntos', async () => {
    const user = userEvent.setup();
    renderHero();
    expect(currentSlide()).toHaveAccessibleName('1 de 3');

    await user.click(screen.getByRole('button', { name: 'Diapositiva siguiente' }));
    expect(currentSlide()).toHaveAccessibleName('2 de 3');
    await user.click(screen.getByRole('button', { name: 'Diapositiva anterior' }));
    await user.click(screen.getByRole('button', { name: 'Diapositiva anterior' }));
    expect(currentSlide()).toHaveAccessibleName('3 de 3');

    await user.click(screen.getByRole('button', { name: /^Diapositiva 1:/ }));
    expect(currentSlide()).toHaveAccessibleName('1 de 3');
    expect(screen.getByRole('button', { name: /^Diapositiva 1:/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    // Muchas consultas por rol: con toda la suite en paralelo puede pasar de los 5 s por defecto.
  }, 15000);

  it('avanza sola cada 7 s y se detiene con el botón de pausa', () => {
    vi.useFakeTimers();
    renderHero();
    act(() => vi.advanceTimersByTime(7000));
    expect(currentSlide()).toHaveAccessibleName('2 de 3');

    act(() => screen.getByRole('button', { name: 'Pausar el avance' }).click());
    // El clic deja el foco dentro, lo que también detiene el avance: se quita para comprobar
    // que basta con la pausa.
    act(() => screen.getByRole('button', { name: 'Reanudar el avance' }).blur());
    act(() => vi.advanceTimersByTime(14000));
    expect(currentSlide()).toHaveAccessibleName('2 de 3');
  });
});
