# Data Model: Mi cuenta

Cambios sobre el [modelo de datos de la feature 001](../001-book-catalog-stores/data-model.md). No hay colecciones nuevas.

## User (`users`): campo nuevo

| Campo | Tipo | Reglas |
|-------|------|--------|
| `session_version` | Number | Obligatorio, ≥ 0, 0 por defecto. Sube en 1 con cada cambio de contraseña (research R2). No se expone en ninguna respuesta ni en la exportación. |

Validaciones que se reutilizan:

- **`name`**: el de la 001 (obligatorio, recortado, de 1 a 100 caracteres).
- **Contraseña nueva**: la `passwordPolicy` del registro (al menos 8 caracteres, con letras y números, y como mucho 200).

Además, la contraseña nueva tiene que ser distinta de la actual. Se comprueba con `bcrypt.compare` contra el hash actual.

Borrado: el documento se elimina con `deleteOne`. Con él desaparecen `name`, `email` y `password_hash`, y el índice único de `email` deja el correo libre (FR-015).

## Reservation (`reservations`): motivo nuevo

`CANCEL_REASONS` añade `account_deleted`.

- Las reservas activas de una cuenta que se borra pasan a `cancelled` con ese motivo, mediante la transición `pending|ready → cancelled` de la 001, que libera `reserved_count` y `active_reservations`.
- Las reservas de una cuenta borrada se conservan. Su `user_id` deja de apuntar a un documento, y en las respuestas del administrador `user` es `null` (research R6).

## Favorite (`favorites`)

Sin cambios de esquema. Al borrar la cuenta se ejecuta `deleteMany({user_id})`.

## AuditLog (`audit_logs`)

Sin cambios de esquema. Cambia lo que se registra y cómo se anonimiza.

| Operación | `action` | `entity_type` | `entity_label` | `before` → `after` |
|-----------|----------|---------------|----------------|--------------------|
| Cambiar el nombre | `update` | `user` | nombre nuevo | `{name}` → `{name}` |
| Cambiar la contraseña | `update` | `user` | nombre | `{password: 'changed'}` en `after`, `null` en `before` |
| Borrar la cuenta | `delete` | `user` | `Cuenta eliminada` | `{role, created_at}` → `null` |
| Cancelar sus reservas activas | `status_change` | `reservation` | título del libro | como en la 001 |

En todas, `user_id` es la propia cuenta.

Al borrar la cuenta, en la misma transacción:

- Las entradas con `entity_type: 'user'` y `entity_id` de la cuenta pasan a `entity_label: 'Cuenta eliminada'`, y se les quitan `before.name`, `before.email`, `after.name` y `after.email` (research R5).
- Las entradas de las que es autora conservan su `user_id`.

**Respuesta de la auditoría (`AuditLogItem`)**: añade `user_deleted`.

- `user` es `{id, name}` si la cuenta existe, o `null` si no la hay o se borró.
- `user_deleted` es `true` cuando la entrada tiene `user_id` pero la cuenta ya no existe.

## Exportación (no se guarda)

```text
{
  exported_at,
  account: {name, email, role, created_at},
  reservations: [{book_title, book_isbn, store_name, store_address, price_cents, status,
                  cancel_reason, created_at, ready_at, expires_at, closed_at}],
  favorites: [{title, author, isbn, added_at}]
}
```

- Las reservas van ordenadas por `created_at` descendente.
- `book_isbn` sale del libro si aún existe y es `null` si se borró.
- Los favoritos llevan los datos actuales del libro.
- No se incluyen ids internos ni campos de seguridad (FR-022).

## Índices

No hacen falta índices nuevos. Estas son las consultas por cuenta y los índices de la 001 que ya las cubren:

| Consulta | Índice |
|----------|--------|
| `Reservation.find({user_id})` | `{user_id: 1, created_at: -1}` |
| `Favorite.find/deleteMany({user_id})` | `{user_id: 1, book_id: 1}` |
| `AuditLog.updateMany({entity_type: 'user', entity_id})` | `{entity_type: 1, created_at: -1}`, más el filtro por `entity_id` |

La última consulta solo se ejecuta al borrar una cuenta, así que no es una lectura frecuente (principio IV).
