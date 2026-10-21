# Contrato: rutas de la SPA

**Feature**: `001-book-catalog-stores` | React Router 7 (modo *data*, sin SSR)

Las rutas protegidas se envuelven en `RequireAuth` (redirige a `/login?next=<ruta>`) o `RequireAdmin`, que además muestra `ForbiddenPage` si el rol no es `admin`. Esto solo afecta a la interfaz: la autorización real la aplica la API (FR-007).

| Ruta | Página | Acceso | Historia | Consume |
|------|--------|--------|----------|---------|
| `/` | `CatalogPage` | público | 1 | `GET /books`, `GET /genres` |
| `/books/:id` | `BookDetailPage` | público; los botones Reservar y Favorito piden sesión | 1, 5, 6 | `GET /books/:id`, `POST /reservations`, `PUT/DELETE /favorites/:id` |
| `/login` | `LoginPage` | público | 4 | `POST /auth/login` |
| `/register` | `RegisterPage` | público | 4 | `POST /auth/register` |
| `/me/reservations` | `MyReservationsPage` | usuario | 5 | `GET /reservations/mine`, `POST /reservations/:id/cancel` |
| `/me/favorites` | `MyFavoritesPage` | usuario | 6 | `GET /favorites`, `DELETE /favorites/:id` |
| `/admin/books` | `AdminBooksPage` | admin | 2 | `GET /books`, `GET /books/:id/deletionImpact`, `DELETE /books/:id` |
| `/admin/books/new`, `/admin/books/:id/edit` | `BookFormPage` | admin | 2 | `POST /books`, `PATCH /books/:id`, `GET /genres` |
| `/admin/stores` | `AdminStoresPage` | admin | 3 | `GET /stores`, `GET /stores/:id/deletionImpact`, `DELETE /stores/:id` |
| `/admin/stores/new`, `/admin/stores/:id/edit` | `StoreFormPage` | admin | 3 | `POST /stores`, `PATCH /stores/:id` |
| `/admin/stores/:id/books` | `StoreInventoryPage` | admin | 3 | `GET/POST/PATCH/DELETE /stores/:id/books…`, `GET /books?q=` (selector de libro) |
| `/admin/reservations` | `AdminReservationsPage` | admin | 5 | `GET /reservations`, `POST …/ready`, `…/pickup` y `…/cancel` |
| `/admin/users` | `AdminUsersPage` | admin | 7 | `GET /users`, `PATCH /users/:id` |
| `/admin/audit` | `AuditLogPage` | admin | 7 | `GET /auditLogs` |
| `*` | `NotFoundPage` | público | casos límite | — |

**Comportamiento común**

- **Estado del catálogo en la URL**: `q`, `genre` y `page` viven en la *query string* (`useSearchParams`), así que las búsquedas se pueden compartir y el botón Atrás funciona.
- **Respuestas `401`**: borran la sesión del `AuthContext` y redirigen a `/login?next=…`. Si había un formulario a medias, no se reenvía (caso límite de la sesión caducada).
- **Bajas**: abren un `ConfirmDialog` con los datos de `deletionImpact` antes de borrar.
- **Mensajes**: los errores de la API se muestran con `error.message`, y los de validación junto a cada campo usando `details`.
