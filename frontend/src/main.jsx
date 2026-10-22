// Punto de entrada de la SPA: React Router en modo data y la sesión por encima del router.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import { routes } from './routes.jsx';
import { loginPathFor } from './utils/safeNext.js';

const router = createBrowserRouter(routes);

// Un 401 de la API (sesión caducada o cuenta desactivada) lleva al login y vuelve después.
function goToLogin() {
  const { location } = router.state;
  if (location.pathname !== '/login') router.navigate(loginPathFor(location), { replace: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider onUnauthorized={goToLogin}>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
