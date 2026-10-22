// Tabla de rutas de la SPA (contracts/ui-routes.md). Las protegidas irán dentro de
// RequireAuth o RequireAdmin a medida que se añadan sus páginas.
import { Layout } from './components/Layout.jsx';
import { BookDetailPage } from './pages/BookDetailPage.jsx';
import { CatalogPage } from './pages/CatalogPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

export const routes = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'books/:id', element: <BookDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
