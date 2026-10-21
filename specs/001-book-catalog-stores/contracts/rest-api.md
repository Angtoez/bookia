# Contrato: API REST de Bookia

**Feature**: `001-book-catalog-stores` | **Base**: `/api` | **Formato**: JSON (UTF-8)

## Convenciones

- **Rutas** en `camelCase` (principio V): `deletionImpact`, `auditLogs`. **Campos JSON** en `snake_case`, igual que los modelos ([data-model.md](../data-model.md)). Los ids son cadenas `ObjectId` y las fechas, ISO 8601 en UTC.
- **Importes** en céntimos enteros (`*_cents`). La moneda se obtiene de `GET /api/config`.
- **Autenticación**: cookie `bookia_session` (`httpOnly`, `secure`, `sameSite=strict`). Columna **Acceso**: `público` (sin sesión), `usuario` (cualquier cuenta activa con sesión; la ruta lleva `authenticate` y `requireRole('user', 'admin')`, principio II) y `admin` (rol `admin`).
- **Paginación**: parámetros `page` (≥ 1, por defecto 1) y `limit` (por defecto 20, máximo 50). Respuesta:

  ```json
  { "items": [ ... ], "page": 1, "limit": 20, "total": 134, "total_pages": 7 }
  ```

- **Errores**: siempre `{"error": {"code": "STRING", "message": "texto en español", "details": [{"field": "isbn", "message": "..."}]}}`. `details` solo aparece en `400`.

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `VALIDATION_ERROR` | El cuerpo, la query o los params no cumplen el esquema. |
| 401 | `UNAUTHENTICATED` | No hay sesión, la sesión ha caducado o la cuenta está desactivada. |
| 401 | `INVALID_CREDENTIALS` | Fallo de inicio de sesión, incluida una cuenta bloqueada. El mensaje es genérico. |
| 403 | `FORBIDDEN` | Hay sesión pero el rol no es suficiente. |
| 404 | `NOT_FOUND` | El recurso no existe. |
| 409 | `EMAIL_TAKEN`, `ISBN_TAKEN`, `ALREADY_ASSOCIATED`, `OUT_OF_STOCK`, `RESERVATION_LIMIT`, `DUPLICATE_RESERVATION`, `INVALID_TRANSITION`, `STOCK_BELOW_RESERVED`, `HAS_ACTIVE_RESERVATIONS`, `LAST_ADMIN` | Conflicto con una regla de negocio. |
| 429 | `TOO_MANY_REQUESTS` | Se ha superado el límite de peticiones en `/api/auth/*`. |
| 500 | `INTERNAL_ERROR` | Error inesperado. Nunca se exponen trazas. |

---

## Configuración

| Método y ruta | Acceso | Respuesta 200 |
|---------------|--------|---------------|
| `GET /config` | público | `{"currency": "EUR", "max_active_reservations": 5, "pending_ttl_days": 7, "pickup_ttl_days": 3}` |
| `GET /genres` | público | `[{"id", "name", "slug"}]`, ordenados por `name` |

## Autenticación (historia 4)

| Método y ruta | Acceso | Cuerpo | Respuesta |
|---------------|--------|--------|-----------|
| `POST /auth/register` | público | `{"name", "email", "password"}` | `201` + cookie + `UserMe`. `409 EMAIL_TAKEN`. |
| `POST /auth/login` | público | `{"email", "password"}` | `200` + cookie + `UserMe`. `401 INVALID_CREDENTIALS`. |
| `POST /auth/logout` | público | — | `204` y borra la cookie. |
| `GET /auth/me` | usuario | — | `200 UserMe`. `401` si no hay sesión válida. |

`UserMe` = `{"id", "name", "email", "role": "user"|"admin"}`

## Libros (historias 1 y 2)

| Método y ruta | Acceso | Entrada | Respuesta |
|---------------|--------|---------|-----------|
| `GET /books` | público | query `q?` (hasta 100 caracteres), `genre?` (slug), `page?`, `limit?` | `200` página de `BookSummary`, ordenada por título |
| `GET /books/:id` | público | — | `200 BookDetail`. `404`. |
| `POST /books` | admin | `BookInput` | `201 BookDetail`. `409 ISBN_TAKEN`. Auditado. |
| `PATCH /books/:id` | admin | `BookInput` parcial | `200 BookDetail`. `409 ISBN_TAKEN`. Auditado. |
| `GET /books/:id/deletionImpact` | admin | — | `200 {"stores": n, "active_reservations": n, "favorites": n}` |
| `DELETE /books/:id` | admin | — | `204`. Cascada: reservas canceladas (`book_deleted`), asociaciones y favoritos. Auditado. |

- `BookSummary` = `{"id", "title", "author", "isbn", "genre": {"id","name","slug"}, "price_cents", "is_favorite"?}`. `is_favorite` solo aparece si hay sesión.
- `BookInput` = `{"title", "author", "genre_id", "isbn", "price_cents", "description"?, "publisher"?, "publication_year"?}`.
- `BookDetail` = `BookSummary` + `{"description", "publisher", "publication_year", "stores": [StoreAvailability]}`.
- `StoreAvailability` = `{"store_id", "name", "address", "opening_hours", "phone", "price_cents", "available", "is_sold_out"}`:
  - `price_cents` es el precio efectivo (el de la tienda o el de referencia).
  - `available` = `stock − reserved_count`.
  - `is_sold_out` = `available == 0`.
  - Si el libro no está en ninguna tienda, `stores` es `[]` (historia 1, escenario 5).

## Puntos de venta e inventario (historia 3, solo admin)

| Método y ruta | Entrada | Respuesta |
|---------------|---------|-----------|
| `GET /stores` | `page?`, `limit?` | `200` página de `Store` ordenada por `name` |
| `GET /stores/:id` | — | `200 Store` |
| `POST /stores` | `{"name", "address", "opening_hours", "phone"?}` | `201 Store`. Auditado. |
| `PATCH /stores/:id` | lo mismo, parcial | `200 Store`. Auditado. |
| `GET /stores/:id/deletionImpact` | — | `200 {"books": n, "active_reservations": n}` |
| `DELETE /stores/:id` | — | `204`. Cascada: reservas canceladas (`store_deleted`) y asociaciones. Auditado. |
| `GET /stores/:id/books` | `page?`, `limit?` | `200` página de `StoreBookItem` |
| `POST /stores/:id/books` | `{"book_id", "stock", "store_price_cents"?}` | `201 StoreBookItem`. `409 ALREADY_ASSOCIATED`. Auditado. |
| `PATCH /stores/:id/books/:bookId` | `{"stock"?, "store_price_cents"?}` (`null` quita el precio propio) | `200 StoreBookItem`. `409 STOCK_BELOW_RESERVED`. Auditado. |
| `DELETE /stores/:id/books/:bookId` | — | `204`. `409 HAS_ACTIVE_RESERVATIONS`. Auditado. |

- `Store` = `{"id", "name", "address", "opening_hours", "phone"}`.
- `StoreBookItem` = `{"book_id", "title", "author", "isbn", "stock", "reserved_count", "available", "store_price_cents", "effective_price_cents"}`.

## Reservas (historia 5)

| Método y ruta | Acceso | Entrada | Respuesta |
|---------------|--------|---------|-----------|
| `POST /reservations` | usuario | `{"book_id", "store_id"}` | `201 Reservation`. `409 OUT_OF_STOCK`, `RESERVATION_LIMIT` o `DUPLICATE_RESERVATION`. `404` si no hay asociación. |
| `GET /reservations/mine` | usuario | `status?`, `page?`, `limit?` | `200` página de `Reservation` propias, de la más reciente a la más antigua |
| `POST /reservations/:id/cancel` | titular o admin | — | `200 Reservation`. `403` si no es el titular ni admin. `409 INVALID_TRANSITION`. |
| `GET /reservations` | admin | `status?`, `store_id?`, `page?`, `limit?` | `200` página de `Reservation` con `user: {"id","name","email"}` |
| `POST /reservations/:id/ready` | admin | — | `200 Reservation`. `409 INVALID_TRANSITION`. Auditado. |
| `POST /reservations/:id/pickup` | admin | — | `200 Reservation`. `409 INVALID_TRANSITION`. Auditado. |

`Reservation` = `{"id", "book_id", "store_id", "book_title", "store_name", "store_address", "price_cents", "status": "pending"|"ready"|"picked_up"|"cancelled"|"expired", "cancel_reason", "created_at", "ready_at", "expires_at", "closed_at"}`

Una reserva activa con `expires_at` vencido se devuelve ya como `expired` ([research R9](../research.md#r9-caducidad-de-reservas-fr-022d-sc-010)).

## Favoritos (historia 6)

| Método y ruta | Acceso | Respuesta |
|---------------|--------|-----------|
| `GET /favorites` | usuario | `200` página de `BookSummary` con `"stores_available": n` (tiendas con `available > 0`) |
| `PUT /favorites/:bookId` | usuario | `204`, idempotente. `404` si el libro no existe. |
| `DELETE /favorites/:bookId` | usuario | `204`, idempotente. |

## Usuarios y auditoría (historia 7, solo admin)

| Método y ruta | Entrada | Respuesta |
|---------------|---------|-----------|
| `GET /users` | `q?` (nombre o correo), `page?`, `limit?` | `200` página de `{"id", "name", "email", "role", "status", "created_at"}` |
| `PATCH /users/:id` | `{"role"?: "user"|"admin", "status"?: "active"|"disabled"}` | `200` usuario. `409 LAST_ADMIN`. Desactivar cancela sus reservas activas (`account_deactivated`). Auditado. |
| `GET /auditLogs` | `entity_type?`, `page?`, `limit?` | `200` página de `{"id", "user": {"id","name"}|null, "action", "entity_type", "entity_id", "entity_label", "before", "after", "created_at"}`, de la más reciente a la más antigua |

No existen rutas de escritura sobre `auditLogs` (FR-028).
