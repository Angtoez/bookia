import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FlashNotice } from '../../src/components/FlashNotice.jsx';

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <FlashNotice />
    </MemoryRouter>,
  );

describe('FlashNotice', () => {
  it('no muestra nada sin aviso', () => {
    const { container } = renderAt('/');
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el aviso de location.state y se quita al cerrarlo', async () => {
    const user = userEvent.setup();
    renderAt({ pathname: '/', state: { notice: 'Tu cuenta se ha borrado' } });
    expect(screen.getByRole('status')).toHaveTextContent('Tu cuenta se ha borrado');
    await user.click(screen.getByRole('button', { name: 'Cerrar el aviso' }));
    expect(screen.queryByText('Tu cuenta se ha borrado')).not.toBeInTheDocument();
  });
});
