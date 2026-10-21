# Data Model: Bookia: catálogo de libros y puntos de venta

**Feature**: `001-book-catalog-stores` | **Fecha**: 2026-10-13 | **Plan**: [plan.md](./plan.md)

MongoDB con Mongoose. Los campos van en `snake_case` (principio V) y las relaciones son referencias por `ObjectId` (principio III). Todas las colecciones tienen `created_at` y `updated_at` (`timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}`), salvo `audit_logs`, que solo tiene `created_at`. Los importes son enteros en céntimos ([research R7](./research.md#r7-importes)).

```text
User 1───* Reservation *───1 StoreBook *───1 Store
  │                              │
  └──1───* Favorite *───1 Book 1─┘──*───1 Genre
AuditLog ··· referencia blanda (entity_type + entity_id) a cualquier entidad
```

## User (`users`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `name` | String | Obligatorio, 1–100 caracteres, sin espacios a los lados. |
| `email` | String | Obligatorio, formato de correo, guardado en minúsculas, **único** (FR-001). |
| `password_hash` | String | Obligatorio, hash bcrypt con al menos 10 rondas; `select: false` (FR-008). |
| `role` | String enum | `user` o `admin`; por defecto `user` (FR-006). |
| `status` | String enum | `active` o `disabled`; por defecto `active`. |
| `failed_login_count` | Number | Por defecto 0; vuelve a 0 al iniciar sesión correctamente. |
| `locked_until` | Date \| null | Se fija a ahora + 15 min al llegar a 5 fallos (FR-004). |
| `active_reservations` | Number | Por defecto 0; invariante `0 ≤ active_reservations ≤ MAX_ACTIVE_RESERVATIONS` (5) (FR-022a). |

- **Índices**: `{email: 1}` único; `{role: 1, status: 1}` para la invariante de FR-024.
- **Validación de entrada** (no se guarda): la contraseña debe tener al menos 8 caracteres e incluir al menos una letra y un número (FR-002).
- **Invariante FR-024**: no se puede degradar ni desactivar a un administrador si es el último con `role = admin` y `status = active`. Se comprueba dentro de una transacción.
- **Serialización**: `toJSON` elimina `password_hash`, `failed_login_count` y `locked_until`.

## Genre (`genres`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `name` | String | Obligatorio, único. |
| `slug` | String | Obligatorio, único y en minúsculas; lo usa el filtro de la URL. |

Se carga con el script de *seed* y es de solo lectura desde la API (FR-016).

## Book (`books`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `title` | String | Obligatorio, 1–300 caracteres. |
| `author` | String | Obligatorio, 1–200 caracteres. Si hay varios autores, van en el mismo campo. |
| `genre_id` | ObjectId → Genre | Obligatorio y debe existir. |
| `isbn` | String | Obligatorio. Se guarda normalizado (sin guiones ni espacios, `X` en mayúscula). Tiene que ser un ISBN-10 o ISBN-13 con dígito de control válido, y es **único** (FR-014). |
| `price_cents` | Number (entero) | Obligatorio, ≥ 0 (FR-015). Es el precio de referencia. |
| `description` | String | Opcional, hasta 5000 caracteres. |
| `publisher` | String | Opcional, hasta 200 caracteres. |
| `publication_year` | Number (entero) | Opcional, entre 1450 y el año actual + 1. |
| `title_search` | String | Derivado de `title` (minúsculas, sin tildes) en el hook `pre('validate')`. No se edita. |
| `author_search` | String | Derivado de `author` del mismo modo. |

- **Índices**: `{isbn: 1}` único; `{genre_id: 1, title_search: 1}`; `{title_search: 1}`; `{author_search: 1}`. Ver [research R6](./research.md#r6-búsqueda-parcial-sin-mayúsculas-ni-tildes-fr-010).
- **Al borrarlo** ([research R10](./research.md#r10-bajas-en-cascada)): se cancelan sus reservas activas (`book_deleted`), se borran sus `StoreBook` y sus `Favorite`, y se audita.

## Store (`stores`) — punto de venta

| Campo | Tipo | Reglas |
|-------|------|--------|
| `name` | String | Obligatorio, 1–150 caracteres. |
| `address` | String | Obligatorio, 1–300 caracteres. |
| `opening_hours` | String | Obligatorio, 1–300 caracteres, texto libre (por ejemplo "L–V 10:00–20:00; S 10:00–14:00"). |
| `phone` | String | Opcional; dígitos, espacios, `+`, `-` y `()`, hasta 30 caracteres. |

- **Índices**: `{name: 1}` para el listado de administración.
- **Al borrarlo**: se cancelan sus reservas activas (`store_deleted`), se borran sus `StoreBook` y se audita (FR-021).

## StoreBook (`store_books`) — disponibilidad de un libro en un establecimiento

| Campo | Tipo | Reglas |
|-------|------|--------|
| `store_id` | ObjectId → Store | Obligatorio. |
| `book_id` | ObjectId → Book | Obligatorio. |
| `stock` | Number (entero) | Obligatorio, ≥ 0 (FR-020). |
| `store_price_cents` | Number (entero) \| null | Opcional, ≥ 0. Si es `null`, se usa `Book.price_cents` (FR-020). |
| `reserved_count` | Number (entero) | Por defecto 0. Solo lo modifican las operaciones de reserva. |

- **Invariante**: `0 ≤ reserved_count ≤ stock`, que se garantiza con actualizaciones condicionales (FR-020a, FR-022b).
- **Derivados**:
  - `available = stock − reserved_count`; si es 0, el establecimiento se muestra como "agotado" (FR-012).
  - `effective_price_cents = store_price_cents ?? book.price_cents`.
- **Índices**: `{store_id: 1, book_id: 1}` único (FR-019); `{book_id: 1}` para cargar el detalle del libro.
- **Reglas de edición**:
  - No se puede fijar `stock < reserved_count` (`409 STOCK_BELOW_RESERVED`).
  - No se puede borrar la asociación si `reserved_count > 0` (`409 HAS_ACTIVE_RESERVATIONS`).

## Reservation (`reservations`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `user_id` | ObjectId → User | Obligatorio. |
| `book_id` | ObjectId → Book | Obligatorio. Puede apuntar a un libro ya borrado. |
| `store_id` | ObjectId → Store | Obligatorio. Puede apuntar a un establecimiento ya borrado. |
| `book_title` | String | Copia del título al reservar, para mostrarla aunque se borre el libro. |
| `store_name` | String | Copia del nombre al reservar. |
| `store_address` | String | Copia de la dirección al reservar. |
| `price_cents` | Number (entero) | Precio efectivo en el momento de reservar (caso límite: se mantiene aunque cambie después). |
| `status` | String enum | `pending`, `ready`, `picked_up`, `cancelled` o `expired`. |
| `is_active` | Boolean | `true` si `status ∈ {pending, ready}`; se mantiene sincronizado en cada transición. |
| `expires_at` | Date \| null | En `pending`, la creación + 7 días; en `ready`, el momento de pasar a lista + 3 días; `null` en los estados finales. |
| `ready_at` | Date \| null | Momento de pasar a `ready`. |
| `closed_at` | Date \| null | Momento de llegar a un estado final. |
| `cancel_reason` | String enum \| null | `user`, `admin`, `book_deleted`, `store_deleted` o `account_deactivated`. |

- **Índices**:
  - `{user_id: 1, book_id: 1, store_id: 1}` único con `partialFilterExpression: {is_active: true}` (FR-022a).
  - `{user_id: 1, created_at: -1}` para "Mis reservas".
  - `{status: 1, store_id: 1, created_at: -1}` para el listado de administración.
  - `{is_active: 1, expires_at: 1}` para el job de caducidad.
  - `{book_id: 1, is_active: 1}` y `{store_id: 1, is_active: 1}` para las cascadas.

### Transiciones de estado (FR-022c a FR-022e)

```text
           ready (admin)              pickup (admin)
pending ───────────────▶ ready ───────────────▶ picked_up
   │                       │
   │ cancel (usuario/admin/cascada)
   ├──────────────────────▶ cancelled ◀──────────┤
   │ expires_at vencido (sistema)                 │
   └──────────────────────▶ expired   ◀──────────┘
```

| Transición | Quién | Efecto en contadores |
|------------|-------|----------------------|
| (nueva) → `pending` | Usuario registrado, si `available ≥ 1` | `StoreBook.reserved_count +1`; `User.active_reservations +1` |
| `pending` → `ready` | Administrador | Ninguno; `expires_at` = ahora + 3 días |
| `ready` → `picked_up` | Administrador | `StoreBook.stock −1`, `reserved_count −1`; `User.active_reservations −1` |
| `pending`/`ready` → `cancelled` | Titular, administrador o cascada | `reserved_count −1` (si el `StoreBook` aún existe); `active_reservations −1` |
| `pending`/`ready` → `expired` | Sistema (job) | Igual que cancelar |

- Cualquier otra transición devuelve `409 INVALID_TRANSITION`.
- Cada transición usa una actualización condicional sobre el `status` de origen, así que es idempotente frente a peticiones repetidas y frente al job.
- Las transiciones que hacen un administrador o el sistema se auditan (FR-027).

## Favorite (`favorites`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `user_id` | ObjectId → User | Obligatorio. |
| `book_id` | ObjectId → Book | Obligatorio. |

- **Índices**: `{user_id: 1, book_id: 1}` único, que hace idempotente el `PUT`; `{book_id: 1}` para la cascada.
- **Al borrar el libro** se borran sus favoritos (FR-022i).

## AuditLog (`audit_logs`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `user_id` | ObjectId → User \| null | `null` si la acción la hace el sistema (por ejemplo, la caducidad). |
| `action` | String enum | `create`, `update`, `delete`, `status_change` o `role_change`. |
| `entity_type` | String enum | `book`, `store`, `store_book`, `user` o `reservation`. |
| `entity_id` | ObjectId | Obligatorio. |
| `entity_label` | String | Título, nombre o correo legible en el momento de la acción. |
| `before` | Mixed \| null | Instantánea previa (`null` en `create`). Nunca contiene `password_hash`. |
| `after` | Mixed \| null | Instantánea posterior (`null` en `delete`). |
| `created_at` | Date | Lo asigna el servidor. |

- **Índices**: `{created_at: -1}`; `{entity_type: 1, created_at: -1}` (FR-029).
- **Inmutable**: los hooks `pre` de `updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany` y `findOneAndDelete` lanzan un error, y la API no expone escritura (FR-028).

## Qué se audita

| Operación | `entity_type` | `action` |
|-----------|---------------|----------|
| Crear, editar o borrar un libro | `book` | `create` / `update` / `delete` |
| Crear, editar o borrar un establecimiento | `store` | `create` / `update` / `delete` |
| Asociar, cambiar stock o precio, o desasociar | `store_book` | `create` / `update` / `delete` |
| Cambio de rol o de estado de una cuenta | `user` | `role_change` / `status_change` |
| Reserva marcada como lista o recogida, cancelada por un administrador o en cascada, o caducada | `reservation` | `status_change` |
