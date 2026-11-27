# Research: Mi cuenta

Decisiones técnicas de la feature 002. Parte del stack y de las decisiones de la feature 001 ([research 001](../001-book-catalog-stores/research.md)), que no se repiten.

## R1. Rutas de la API

- **Decision**: un router nuevo, `/api/account`, que siempre actúa sobre `req.user`:
  - `GET /account`, `PATCH /account` y `DELETE /account`.
  - `POST /account/password`.
  - `GET /account/export`.

  Todas las rutas llevan `authenticate` y `requireRole('user', 'admin')`. Las que piden la contraseña (`password` y `DELETE`) llevan además su propio `createAuthRateLimit()`.
- **Rationale**:
  - Al no recibir ningún id, ninguna ruta puede apuntar a otra cuenta (FR-003). Así no hay comprobaciones de «es el titular» que se puedan olvidar.
  - `/users/:id` sigue siendo solo del administrador, como en la 001.
  - Las rutas van en `camelCase` (principio V).
  - La prueba de autorización de la 001 (T128) exige `requireRole` en toda ruta con `authenticate`.
- **Alternatives considered**:
  - `/users/me`: mezcla el autoservicio con la gestión del administrador en el mismo router, y `me` chocaría con el parámetro `:id`.
  - Ampliar `/auth/me`: `auth` es para la sesión, no para gestionar la cuenta.

## R2. Invalidar las demás sesiones al cambiar la contraseña (FR-011)

- **Decision**:
  - `User` gana `session_version` (número, 0 por defecto).
  - El JWT lleva `ver` además de `sub`.
  - `authenticate` rechaza el token si `ver` (0 si falta) no coincide con `session_version`.
  - Al cambiar la contraseña, `session_version` sube en 1 y la respuesta emite una cookie nueva con la versión nueva, así que la sesión actual sigue abierta.
- **Rationale**:
  - El JWT es *stateless* y caduca a las 24 h. Sin una versión en la base de datos, las demás sesiones seguirían valiendo hasta un día.
  - `authenticate` ya carga el usuario en cada petición, así que comparar un número no añade consultas (principio IV).
  - Los tokens que ya existen no llevan `ver` y se tratan como versión 0, de modo que nadie pierde la sesión al desplegar.
- **Alternatives considered**:
  - Lista negra de tokens: necesita otra colección y limpieza periódica.
  - `password_changed_at` comparado con el `iat` del token: tiene un problema de resolución, porque `iat` va en segundos y un cambio y un inicio de sesión en el mismo segundo se confunden.

## R3. Comprobar la contraseña actual (FR-010, FR-024)

- **Decision**:
  - Se compara con `bcrypt.compare` contra `password_hash` antes de abrir la transacción.
  - Si falla, se responde `400 WRONG_PASSWORD`, con `details: [{field, message}]` para que el formulario lo pinte junto al campo.
  - Fallar no toca `failed_login_count`. El límite es el de `createAuthRateLimit` (20 intentos por IP cada 15 min), con una instancia propia para este router.
- **Rationale**:
  - bcrypt tarda decenas de milisegundos: fuera de la transacción, esta no se alarga.
  - Responder `400` y no `401` evita que el cliente lo interprete como una sesión caducada: `apiClient` emite un evento ante `401`.
- **Alternatives considered**: reutilizar el bloqueo de 5 intentos. Un atacante con la sesión robada podría bloquear la cuenta de su víctima, y la spec lo descarta (FR-024).

## R4. Borrado de la cuenta en una transacción (FR-012 a FR-020)

- **Decision**: `deleteAccountCascade(user, session)` en `services/accountService.js`, dentro de `runInTransaction`. Hace, en orden:
  1. Si el usuario es un administrador activo, comprueba que queda otro, con la función de la 001 que bloquea los demás administradores (`assertAnotherActiveAdmin`). Esa función se mueve de `usersController.js` a `services/adminGuard.js` para compartirla.
  2. `cancelActiveFor({user_id}, 'account_deleted', user._id, session)`, que cancela, libera los contadores y audita cada reserva, igual que al desactivar una cuenta.
  3. `Favorite.deleteMany({user_id})`.
  4. Anonimiza la auditoría (R5).
  5. Escribe la entrada de auditoría del borrado.
  6. `User.deleteOne`.

  Después se borra la cookie y se responde `204`.
- **Rationale**:
  - Reutiliza las piezas de la 001, que ya resolvían la concurrencia: `cancelActiveFor` y `assertAnotherActiveAdmin`.
  - Con una sola transacción el borrado es todo o nada (FR-020). Si dos administradores se borran a la vez, una de las transacciones choca y, al reintentarse, ve el cambio de la otra (FR-019, SC-005).
  - Una reserva que caduca a la vez tampoco se libera dos veces, porque `cancelActiveFor` y el job usan la misma transición condicional.
- **Alternatives considered**: marcar la cuenta como borrada (*soft delete*). Conservaría el nombre y el correo, contra FR-015, y el correo seguiría ocupado.

## R5. Auditoría sin nombre ni correo (FR-017, SC-003)

- **Decision**:
  - Las entradas con `entity_type: 'user'` y `entity_id` de la cuenta pasan a tener `entity_label: 'Cuenta eliminada'`. Además se les quitan `name` y `email` de `before` y `after`, con un `updateMany` de tipo *pipeline* (`$unset`).
  - Las entradas de las que la cuenta es autora conservan `user_id`, pero ese id ya no apunta a nadie.
  - `listAuditLogs` deja de usar `populate`: lee los `user_id` de la página y busca esos usuarios en una sola consulta. Así distingue tres casos:
    - sin `user_id`: «Sistema», como hasta ahora;
    - con `user_id` y el usuario existe: su nombre;
    - con `user_id` y el usuario no existe: «Cuenta eliminada».
  - `AuditLogItem` gana `user_deleted: boolean`.
- **Rationale**:
  - Con `populate`, un usuario que no existe se convierte en `null` y se confundiría con «Sistema».
  - Lo único que guardaba el nombre era `entity_label` y el `before`/`after` de las entradas de tipo `user`. Las de reservas llevan el título del libro y su copia de la reserva solo tiene `user_id`.
  - Borrar las entradas iría contra el principio VII: el registro de cambios tiene que seguir completo.
- **Inmutabilidad (añadido al implementar)**: el modelo `AuditLog` de la 001 rechaza cualquier modificación o borrado de las entradas. Para no abrir esa protección, la anonimización tiene una única vía: el método estático `AuditLog.anonymizeAccount(userId, session)`. Ese método lanza el `updateMany` con la opción `bookiaAnonymizeAccount`, que el *hook* de la guarda acepta solo en esa operación. Solo cambia `entity_label` y quita `name` y `email` de `before` y `after`. El resto de escrituras siguen prohibidas, y lo comprueban `auditLogs.test.js` y `stores.test.js`.
- **Alternatives considered**: guardar en cada entrada un `user_deleted` en el momento del borrado. Obliga a actualizar todas las entradas de las que la cuenta es autora, que pueden ser muchas en el caso de un administrador, sin aportar nada a la búsqueda.

## R6. Reservas cerradas de una cuenta borrada (FR-016)

- **Decision**: se conservan sin cambios. Su único vínculo con la persona es `user_id`, que deja de apuntar a nadie. `listReservations` (administrador) ya usa `populate`, así que `user` sale `null`, y la tabla muestra «Cuenta eliminada» cuando `user` es `null`.
- **Rationale**:
  - Una reserva siempre tiene usuario, así que `null` solo puede significar cuenta borrada.
  - Las reservas guardan copias del libro y la tienda (`book_title`, `store_name`…), nunca del usuario.
- **Alternatives considered**: borrarlas. Las librerías perderían el historial de lo que se reservó y recogió.

## R7. Exportación de datos (FR-021, FR-022)

- **Decision**:
  - `GET /account/export` responde el JSON con `Content-Disposition: attachment; filename="bookia-mis-datos-AAAA-MM-DD.json"`.
  - El frontend lo descarga con un enlace normal (`<a href="/api/account/export" download>`). La cookie viaja sola, porque la SPA y la API comparten origen a través del *proxy* de Vite.
  - La exportación no se audita: es una lectura.
- **Rationale**:
  - El navegador gestiona la descarga sin JavaScript extra ni objetos `Blob`.
  - El *presenter* selecciona campo a campo lo que sale. Así es imposible que se cuelen `password_hash`, `failed_login_count`, `locked_until` o `session_version`.
- **Alternatives considered**: `fetch` y `URL.createObjectURL`. Solo aportaría mostrar los errores en la página, y con sesión válida no hay errores esperables.

## R8. Frontend

- **Decision**:
  - Ruta `/me/account` bajo `RequireAuth`, que admite los dos roles, con `MyAccountPage`.
  - La página se divide en componentes para no pasar de 300 líneas:
    - `AccountProfileForm`, para el nombre;
    - `ChangePasswordForm`, que reutiliza `PASSWORD_RULES` y el mensaje de `utils/passwordPolicy.js`;
    - `AccountDataDownload`;
    - `DeleteAccountSection`, con `ConfirmDialog` y el campo de contraseña.
  - Al guardar el nombre se llama a `setUser` de `AuthContext`, para que la cabecera cambie al momento (FR-006).
  - Tras borrar la cuenta, `AuthContext` vacía la sesión y se navega a `/` con `state.notice`. `Layout` muestra ese aviso una vez, en una región `role="status"`.
  - «Mi cuenta» aparece en `UserMenu`, en el menú lateral y en el pie para los dos roles. Al administrador, el menú lateral le muestra «Mi cuenta» sin reservas ni favoritos.
  - `reservationStatusLabel` añade el motivo «cuenta eliminada».
  - Se actualiza la política de privacidad (§ 6 y § 7).
- **Rationale**: sigue los patrones existentes: `FormField`, errores por campo desde `details`, `ConfirmDialog` y `useAuth`.

## R9. Pruebas

- **Decision**:
  - **Integración:** `account.test.js` (ver, cambiar el nombre, cambiar la contraseña con la sesión antigua invalidada, y exportar) y `account.delete.test.js` (cascada, anonimización con búsqueda del nombre y el correo en todas las colecciones, `LAST_ADMIN` y dos administradores a la vez con `Promise.all`).
  - **Unitarias:** de `accountController` con mocks, como exige el principio VI para todos los controladores, y de la versión de sesión en `sessionCookie` y `authenticate` (hoy `authenticate` solo se prueba en integración).
  - **Frontend:** `MyAccountPage` y los formularios.
  - **Autorización:** la tabla de T128 se amplía con las rutas nuevas.
- **Rationale**: cubre los criterios SC-002 a SC-007 de forma automática y mantiene la cobertura por encima del 70 %.
