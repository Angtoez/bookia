import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookCover } from '../../src/components/BookCover.jsx';

const book = { isbn: '9780307474728', genre: { slug: 'novela' } };

describe('BookCover', () => {
  it('muestra la portada real cuando carga, sobre la genérica del color del género', () => {
    const { container } = render(<BookCover book={book} />);
    const cover = container.firstChild;
    expect(cover).toHaveAttribute('aria-hidden', 'true');
    expect(cover).toHaveClass('bg-teal-700');
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('9780307474728-M.jpg'));
    expect(img).toHaveClass('opacity-0');
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });

  it('se queda con la portada genérica si la imagen no existe', () => {
    const { container } = render(<BookCover book={book} size="lg" />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('Bookia');
  });

  it('no pide imagen sin un ISBN válido', () => {
    const { container } = render(<BookCover book={{ isbn: '123', genre: null }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstChild).toHaveClass('bg-stone-500');
  });
});
