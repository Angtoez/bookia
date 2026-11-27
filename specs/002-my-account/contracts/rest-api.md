# Contrato: API de Mi cuenta

**Feature**: `002-my-account`. Sigue las convenciones de la [API de la 001](../../001-book-catalog-stores/contracts/rest-api.md#convenciones): prefijo `/api`, JSON en `snake_case`, rutas en `camelCase` y errores `{"error": {"code", "message", "details?"}}`.

Todas las rutas actúan sobre la cuenta de la sesión y no reciben ningún id (FR-003). Acceso: usuario o admin (`authenticate` + `requireRole('user', 'admin')`). Sin sesión válida, responden `401 UNAUTHENTICATED`.

## Cuenta

| Método y ruta | Entrada | Respuesta |
|---------------|---------|-----------|
| `GET /account` | — | `200 Account` |
| `PATCH /account` | `{"name"}` (de 1 a 100 caracteres, recortado; campos extra rechazados) | `200 Account`. `400 VALIDATION_ERROR`. Auditado si el nombre cambia. |
| `POST /account/password` | `{"current_password", "new_password"}` | `204` y cookie de sesión nueva. `400 WRONG_PASSWORD` (`details` en `current_password`). `400 VALIDATION_ERROR` si `new_password` no cumple la política o es igual a la actual. `429 TOO_MANY_REQUESTS`. Auditado. |
| `GET /account/export` | — | `200 AccountExport` con `Content-Disposition: attachment; filename="bookia-mis-datos-AAAA-MM-DD.json"` |
| `DELETE /account` | `{"password"}` | `204` y borra la cookie. `400 WRONG_PASSWORD`. `409 LAST_ADMIN`. `429 TOO_MANY_REQUESTS`. Auditado. |

`Account` = `{"id", "name", "email", "role": "user"|"admin", "created_at"}`

`AccountExport` = el documento descrito en [data-model § Exportación](../data-model.md#exportación-no-se-guarda).

**Mensajes**

| Código | Mensaje |
|--------|---------|
| `WRONG_PASSWORD` | «La contraseña actual no es correcta» |
| Contraseña nueva igual a la actual (`VALIDATION_ERROR`, campo `new_password`) | «La nueva contraseña debe ser distinta de la actual» |
| `LAST_ADMIN` | «No puedes borrar tu cuenta: eres el último administrador activo» |

Los demás mensajes son los de la 001. Por ejemplo, la política de contraseñas: «La contraseña debe tener al menos 8 caracteres, con letras y números».

**Límites**: `POST /account/password` y `DELETE /account` comparten una instancia de `createAuthRateLimit` (20 peticiones por IP cada 15 min). Fallar la contraseña aquí no cuenta para el bloqueo de inicio de sesión (FR-024).

**Sesión**: el JWT lleva `{sub, ver}`, y un token con `ver` distinto de `session_version` se trata como sin sesión. Tras `POST /account/password`, solo valen los tokens emitidos desde ese momento, incluido el de la respuesta.

## Cambios en endpoints de la 001

| Endpoint | Cambio |
|----------|--------|
| `GET /auditLogs` | `AuditLogItem` añade `"user_deleted": boolean`. `user` es `null` y `user_deleted: true` si la autora era una cuenta borrada; `entity_label` es `"Cuenta eliminada"` en las entradas sobre esa cuenta. |
| `GET /reservations` (admin) | `user` es `null` si la cuenta se borró. |
| `Reservation.cancel_reason` | Nuevo valor `"account_deleted"`. |
| `POST /auth/login`, `POST /auth/register` | Emiten el token con `ver`. Una cuenta borrada recibe `401 INVALID_CREDENTIALS`, como un correo que no existe. |
