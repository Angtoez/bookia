// Descargar mis datos (feature 002, US4): un enlace normal con `download`; la cookie de sesión
// viaja sola porque la SPA y la API comparten origen (research R7).
import { Link } from 'react-router';
import { ACCOUNT_EXPORT_URL } from '../services/accountService.js';
import { AccountSection, PRIMARY_BUTTON } from './AccountSection.jsx';

export function AccountDataDownload() {
  return (
    <AccountSection
      title="Tus datos personales"
      description="Descarga en un archivo todo lo que Bookia guarda de ti: tu cuenta, tus reservas y tus favoritos."
    >
      <p className="text-sm text-stone-600">
        El archivo está en formato JSON, que se abre con cualquier editor de texto y se puede llevar
        a otro servicio. No incluye tu contraseña. Más información en la{' '}
        <Link
          to="/privacidad"
          className="font-medium text-primary-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
        >
          política de privacidad
        </Link>
        .
      </p>
      <a href={ACCOUNT_EXPORT_URL} download className={PRIMARY_BUTTON}>
        Descargar mis datos
      </a>
    </AccountSection>
  );
}
