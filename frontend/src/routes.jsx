// Tabla de rutas de la SPA (contracts/ui-routes.md). Las de usuario van dentro de RequireAuth y
// las de administración dentro de RequireAdmin; la autorización real la aplica la API.
import { Layout } from './components/Layout.jsx';
import { RequireAdmin } from './components/RequireAdmin.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { AdminBooksPage } from './pages/admin/AdminBooksPage.jsx';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage.jsx';
import { AdminStoresPage } from './pages/admin/AdminStoresPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AuditLogPage } from './pages/admin/AuditLogPage.jsx';
import { BookFormPage } from './pages/admin/BookFormPage.jsx';
import { StoreFormPage } from './pages/admin/StoreFormPage.jsx';
import { StoreInventoryPage } from './pages/admin/StoreInventoryPage.jsx';
import { BookDetailPage } from './pages/BookDetailPage.jsx';
import { CatalogPage } from './pages/CatalogPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MyAccountPage } from './pages/MyAccountPage.jsx';
import { MyFavoritesPage } from './pages/MyFavoritesPage.jsx';
import { PrivacyPage } from './pages/PrivacyPage.jsx';
import { MyReservationsPage } from './pages/MyReservationsPage.jsx';
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
      { path: 'privacidad', element: <PrivacyPage /> },
      {
        path: 'me',
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <MyAccountPage /> },
          { path: 'reservations', element: <MyReservationsPage /> },
          { path: 'favorites', element: <MyFavoritesPage /> },
        ],
      },
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
          { path: 'reservations', element: <AdminReservationsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'audit', element: <AuditLogPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
