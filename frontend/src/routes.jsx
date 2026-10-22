// Tabla de rutas de la SPA (contracts/ui-routes.md). Las de administración van dentro de
// RequireAdmin; la autorización real la aplica la API.
import { Layout } from './components/Layout.jsx';
import { RequireAdmin } from './components/RequireAdmin.jsx';
import { AdminBooksPage } from './pages/admin/AdminBooksPage.jsx';
import { AdminStoresPage } from './pages/admin/AdminStoresPage.jsx';
import { BookFormPage } from './pages/admin/BookFormPage.jsx';
import { StoreFormPage } from './pages/admin/StoreFormPage.jsx';
import { StoreInventoryPage } from './pages/admin/StoreInventoryPage.jsx';
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
      {
        path: 'admin',
        element: <RequireAdmin />,
        children: [
          { path: 'books', element: <AdminBooksPage /> },
          { path: 'books/new', element: <BookFormPage /> },
          { path: 'books/:id/edit', element: <BookFormPage /> },
          { path: 'stores', element: <AdminStoresPage /> },
          { path: 'stores/new', element: <StoreFormPage /> },
          { path: 'stores/:id/edit', element: <StoreFormPage /> },
          { path: 'stores/:id/books', element: <StoreInventoryPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
