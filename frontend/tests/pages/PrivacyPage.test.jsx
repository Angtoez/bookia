import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PRIVACY_OWNER, PrivacyPage } from '../../src/pages/PrivacyPage.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );

describe('PrivacyPage', () => {
  it('explica los datos, las cookies y los derechos', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeInTheDocument();
    for (const name of ['2. Qué datos tratamos', '5. Cookies', '7. Tus derechos']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('bookia_session')).toBeInTheDocument();
    expect(document.title).toBe('Política de privacidad · Bookia');
  });

  it('marca como pendientes los datos del responsable que faltan', () => {
    renderPage();
    const pending = Object.values(PRIVACY_OWNER).filter((value) => !value).length;
    // El correo aparece dos veces: en el responsable y en los derechos.
    expect(screen.queryAllByText(/^\[Pendiente:/).length).toBeGreaterThanOrEqual(pending);
  });
});
