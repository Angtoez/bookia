# Research: Bookia: catálogo de libros y puntos de venta

**Feature**: `001-book-catalog-stores` | **Fecha**: 2026-10-13 | **Plan**: [plan.md](./plan.md)

Cada decisión resuelve una incógnita del Technical Context o concreta cómo cumplir la constitución. Formato: decisión, motivo y alternativas descartadas.

## R1. Versiones del stack

- **Decision**: Node.js 24 LTS, Express 5, Mongoose 8, React 19, Vite (última estable), React Router 7 en modo *data* (`createBrowserRouter`), Tailwind CSS 4 con el plugin `@tailwindcss/vite`. Las versiones exactas se fijan en `package-lock.json` al instalar.
- **Rationale**: son las versiones estables vigentes (principio I). Express 5 trae el manejo nativo de errores en handlers `async`, lo que evita envolver cada controlador.
- **Alternatives considered**: Express 4 (en mantenimiento, obliga a un wrapper `asyncHandler`); el modo *framework* de React Router 7, descartado porque añade SSR y la constitución lo prohíbe.

## R2. Estructura del repositorio

- **Decision**: monorepo con workspaces de npm: `backend/` (API Express) y `frontend/` (SPA Vite). En la raíz, `package.json` solo con scripts que orquestan ambos (`lint`, `test`, `dev`).
- **Rationale**: la constitución pide un servidor Express independiente de la SPA y un pipeline de CI que lance linters y pruebas de todo con un solo comando.
- **Alternatives considered**: dos repositorios separados (más fricción para un equipo de curso) o Express sirviendo la SPA compilada (acopla los despliegues).

## R3. Autenticación y sesión

- **Decision**: JWT firmado con `jsonwebtoken` (HS256, secreto `JWT_SECRET`), caducidad de 24 h (FR-005), en una cookie `bookia_session` con `httpOnly`, `secure`, `sameSite: 'strict'` y `maxAge` de 24 h. El payload solo lleva `sub` (id de usuario). En cada petición autenticada, el middleware `authenticate` carga el usuario por `_id` y comprueba `status` y `role`.
- **Rationale**: cargar el usuario en cada petición hace que la desactivación y los cambios de rol se apliquen en la siguiente acción (FR-025), sin listas negras de tokens. Es una lectura por clave primaria, muy por debajo de los 200 ms.
- **Alternatives considered**: meter el rol en el token (no cumple FR-025 hasta que caduca); usar *refresh tokens* (innecesarios con sesiones de 24 h).
- **Notas**:
  - Los navegadores aceptan cookies `secure` en `http://localhost`, así que el desarrollo local funciona sin HTTPS.
  - En desarrollo, el proxy de Vite (`/api` → Express) mantiene el mismo origen. En producción, SPA y API deben compartir *site* (por ejemplo `bookia.example` y `api.bookia.example`) para que `sameSite: 'strict'` envíe la cookie.

## R4. Contraseñas, bloqueo y enumeración de cuentas

- **Decision**: `bcrypt` con `BCRYPT_ROUNDS` (variable de entorno, por defecto 12, mínimo 10). El usuario guarda `failed_login_count` y `locked_until`: al 5.º fallo seguido se bloquea 15 minutos (FR-004) y un inicio de sesión correcto pone el contador a cero. Si el correo no existe, se compara igualmente contra un hash ficticio para igualar tiempos, y la respuesta es siempre el mismo `401 INVALID_CREDENTIALS` (FR-003). Una cuenta bloqueada responde también con un mensaje genérico.
- **Rationale**: cumple el principio II y FR-002 a FR-004 sin revelar qué correos existen.
- **Alternatives considered**: `bcryptjs` (más lento y sin ventaja con Node LTS). Además, `express-rate-limit` (MIT) limita `/api/auth/*` por IP como defensa adicional.

## R5. Validación y saneamiento de entradas

- **Decision**: esquemas `zod` (MIT) en `backend/src/validators/` aplicados por el middleware `validate(schema)` a `body`, `params` y `query`. Además, `mongoose.set('sanitizeFilter', true)` y `strictQuery: true` a nivel global. Los ids se validan como `ObjectId` antes de consultar.
- **Rationale**: el principio II prohíbe construir filtros sin validar. `zod` tipa y rechaza operadores (`$gt`…) antes de llegar a Mongoose, y `sanitizeFilter` es la segunda barrera.
- **Alternatives considered**: `express-mongo-sanitize` (incompatible con el `req.query` de solo lectura de Express 5 y sin mantenimiento); `joi` (BSD-3-Clause, no permitida).

## R6. Búsqueda parcial sin mayúsculas ni tildes (FR-010)

- **Decision**: cada libro guarda `title_search` y `author_search`, que son el título y el autor en minúsculas, sin diacríticos (`normalize('NFD')` y eliminación de las marcas combinantes) y con los espacios colapsados. Se recalculan en un hook `pre('validate')`. La búsqueda normaliza igual el término, lo escapa para regex (`escapeRegExp`) y consulta `{$or: [{title_search: /término/}, {author_search: /término/}]}`. Hay índices compuestos `{genre_id, title_search}` y `{author_search}`, y el orden por defecto es `title_search`.
- **Rationale**: los índices de texto de MongoDB trabajan con palabras completas y no encuentran "cien añ". Una regex sin ancla recorre el índice (`IXSCAN`) y no la colección. Con 10 000 libros cabe de sobra en 200 ms. Escapar el término cubre el caso límite de los caracteres especiales.
- **Alternatives considered**: índice `text` (no admite coincidencias parciales); Atlas Search (dependencia de un servicio externo no exigida); `collation` con `strength: 1` (las regex no la usan).

## R7. Importes

- **Decision**: los precios se guardan como enteros en céntimos (`price_cents`, `store_price_cents`). La API recibe y devuelve céntimos y el frontend formatea con `Intl.NumberFormat('es', {style: 'currency', currency: CURRENCY})`. La moneda viene de la variable de entorno `CURRENCY` (por defecto `EUR`) y la expone `GET /api/config`.
- **Rationale**: evita errores de coma flotante y hace trivial la regla de "máximo dos decimales" de FR-015.
- **Alternatives considered**: `Decimal128` (más incómodo de serializar y validar).

## R8. Reservas sin sobrerreserva (FR-022b, SC-009)

- **Decision**: cada `StoreBook` (libro en establecimiento) guarda `stock` y `reserved_count` con la invariante `0 ≤ reserved_count ≤ stock`. Las operaciones que tocan varios documentos se hacen en una transacción de MongoDB (`session.withTransaction`):
  1. **Crear una reserva**:
     - `findOneAndUpdate({_id, $expr: {$lt: ['$reserved_count', '$stock']}}, {$inc: {reserved_count: 1}})`. Si no encuentra el documento, `409 OUT_OF_STOCK`.
     - Sobre el usuario, `$inc` de `active_reservations` con la condición `active_reservations < MAX_ACTIVE_RESERVATIONS`. Si falla, `409 RESERVATION_LIMIT`.
     - Insertar la reserva con `is_active: true`. Un índice único parcial en `{user_id, book_id, store_id}` con `partialFilterExpression: {is_active: true}` impide los duplicados activos; si salta, `409 DUPLICATE_RESERVATION`.
  2. **Cancelar o caducar una reserva**: se hace el `$inc` inverso de `reserved_count` y `active_reservations`, `is_active` pasa a `false` y se escribe la entrada de auditoría.
  3. **Recoger una reserva**: `stock -1` y `reserved_count -1` en el `StoreBook`, `active_reservations -1` en el usuario y `is_active` a `false`.
- **Rationale**: las actualizaciones condicionales son atómicas por documento. La transacción garantiza que el contador, la reserva y la auditoría se confirmen juntos. Si dos peticiones compiten por la última unidad, una de las dos condiciones falla, o la transacción aborta por conflicto de escritura y `withTransaction` la reintenta y fallará la condición.
- **Alternatives considered**: contar las reservas activas en cada petición (hay una carrera entre el conteo y la inserción); bloqueos en la aplicación (no funcionan con varias instancias).
- **Requisito derivado**: las transacciones exigen un *replica set*. Atlas lo es por defecto; en local se usa un *replica set* de un nodo (Docker) y en las pruebas, `MongoMemoryReplSet`.

## R9. Caducidad de reservas (FR-022d, SC-010)

- **Decision**: cada reserva guarda `expires_at`: creación + `PENDING_TTL_DAYS` (7) en estado `pending`, y momento de pasar a lista + `PICKUP_TTL_DAYS` (3) en estado `ready`. Un job en proceso (`jobs/expireReservations.js`) se ejecuta cada `EXPIRATION_INTERVAL_MS` (por defecto 60 000) con `setInterval`. Busca `{is_active: true, expires_at: {$lte: now}}` usando el índice `{is_active, expires_at}` y caduca cada reserva con la misma transacción que una cancelación, y una actualización condicional sobre el `status` actual para ser idempotente. Además, la caducidad se aplica **al tocar los datos**: `expireOverdue(filter, session)` caduca de verdad (con la misma transición que el job) las reservas activas vencidas que cumplan el filtro, y se llama antes de reservar (`{store_id, book_id}` y `{user_id}`), antes de cualquier transición y antes de listar reservas. Así, una reserva vencida nunca bloquea una unidad nueva, no cuenta para el límite de 5 y no se puede cancelar ni recoger. El único desfase aceptado es que el detalle público del libro puede contar como reservada una unidad vencida durante, como mucho, un intervalo del job (1 min).
- **Rationale**: no añade dependencias. Es idempotente aunque se ejecuten varias instancias, y el retraso máximo (1 min) es irrelevante con plazos de días.
- **Alternatives considered**: mostrar como caducadas las reservas vencidas sin escribirlo (descartado: el estado mostrado no coincidía con los contadores); índice TTL (borra documentos y no libera stock ni audita); `node-cron` o colas (Agenda, BullMQ), que son más infraestructura de la necesaria.

## R10. Bajas en cascada

- **Decision**: borrar un libro, borrar un establecimiento o desactivar una cuenta se hace en una única transacción:
  1. Cancelar sus reservas activas con `cancel_reason` (`book_deleted`, `store_deleted` o `account_deactivated`), liberando contadores.
  2. Borrar los `StoreBook` afectados.
  3. En el caso de un libro, borrar sus favoritos.
  4. Borrar el documento principal.
  5. Escribir la auditoría: una entrada para la baja con la instantánea del documento y una por cada reserva cancelada.

  Antes de confirmar, la UI consulta `GET …/deletionImpact` para mostrar cuántas tiendas y reservas se verán afectadas (casos límite de la spec). Desasociar un libro de una tienda con reservas activas se rechaza (`409 HAS_ACTIVE_RESERVATIONS`), por coherencia con FR-020a.
- **Rationale**: FR-017, FR-021 y FR-022f, junto con la auditoría, deben ser todo o nada.
- **Alternatives considered**: borrado lógico (la spec fija bajas definitivas y deja los datos en la auditoría).

## R11. Auditoría (principio VII, FR-026 a FR-029)

- **Decision**: colección `audit_logs` con `user_id` (null si la acción la hace el sistema), `action` (`create`, `update`, `delete`, `status_change`, `role_change`), `entity_type` (`book`, `store`, `store_book`, `user`, `reservation`), `entity_id`, `entity_label` (título o nombre, para leer el log aunque se borre el elemento), `before`, `after` y `created_at`. Se escribe con `auditService.record(entry, session)` dentro de la misma transacción que la operación. Los hooks de Mongoose sobre el modelo bloquean `updateOne`, `deleteOne`, etc., y ninguna ruta los expone (FR-028). Las contraseñas nunca entran en `before` ni en `after`.
- **Rationale**: la escritura transaccional garantiza el 100 % de SC-005.
- **Alternatives considered**: *change streams* (más complejos y no sabrían quién hizo el cambio).

## R12. Géneros

- **Decision**: colección `genres` (`name`, `slug` único) cargada por el script `npm run seed`, junto con el administrador inicial (`ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` desde el entorno). Se expone con `GET /api/genres` y el libro la referencia con `genre_id`.
- **Rationale**: la spec la define como una lista predefinida que se carga al instalar y no se edita desde la aplicación.
- **Alternatives considered**: una constante en el código (duplicada entre frontend y backend).

## R13. Pruebas y cobertura (principio VI)

- **Decision**:
  - **Backend**: Vitest + Supertest. Las pruebas unitarias de controladores mockean los modelos de Mongoose con `vi.mock`. Las de integración levantan la app contra `MongoMemoryReplSet` (`mongodb-memory-server`).
  - **Frontend**: Vitest + React Testing Library + jsdom.
  - **Cobertura**: `@vitest/coverage-v8` con umbral del 70 % en `backend/src/controllers`, `backend/src/services`, `backend/src/middlewares` y `frontend/src/{hooks,services,utils}`.
- **Rationale**: un solo runner para ambos lados (todo con licencia MIT). Los *replica sets* en memoria permiten probar transacciones y concurrencia reales.
- **Alternatives considered**: Jest (soporte de ESM más torpe); una base de datos de prueba compartida (pruebas frágiles).

## R14. Estado global del frontend

- **Decision**: `AuthContext` (usuario actual, `login`, `logout` y `register`), inicializado con `GET /api/auth/me`. El resto del estado es local a cada página mediante hooks (`useBooks`, `useReservations`, `useFavorites`…). No se usan Zustand ni Redux.
- **Rationale**: el único estado realmente global es la sesión; así se cumple la preferencia por Context API.
- **Alternatives considered**: Zustand (innecesario con este volumen); TanStack Query (útil, pero no hace falta y añade otra API que aprender).

## R15. Licencias de dependencias

- **Decision**:
  - Todas las dependencias directas son MIT o Apache-2.0: express, mongoose, mongodb (Apache-2.0), jsonwebtoken, bcrypt, cookie-parser, helmet, express-rate-limit, zod, react, react-dom, react-router, vite, tailwindcss, vitest, supertest, mongodb-memory-server, @testing-library/react, eslint y prettier.
  - También cumplen: cors, concurrently, @vitejs/plugin-react, @tailwindcss/vite, jsdom, @testing-library/user-event, @testing-library/jest-dom y @vitest/coverage-v8 (todas MIT).
  - `dotenv` (BSD-2-Clause) es la excepción que recoge expresamente la constitución 1.0.1.
  - Las dependencias transitivas deben tener licencias permisivas (MIT, MIT-0, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0 o BlueOak-1.0.0), según la constitución 1.0.2. Se exceptúan `lightningcss` (MPL-2.0, vía Vite y Tailwind 4) y `caniuse-lite` (CC-BY-4.0, vía browserslist), que trae el stack obligatorio.
  - El script `npm run licenses` comprueba las directas contra MIT/Apache-2.0 (salvo `dotenv`) y las transitivas contra la lista permisiva.
- **Rationale**: aplica literalmente la regla de licencias de la constitución 1.0.1, enmendada para resolver el choque entre la regla original y el principio II.
- **Alternatives considered**: `process.loadEnvFile()` nativo de Node 24, que evitaría `dotenv`; se descartó al enmendar la constitución porque obligaba a cambiar el principio II.
