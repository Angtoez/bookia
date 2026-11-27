---

description: "Lista de tareas de la feature 001-book-catalog-stores"
---

# Tasks: Bookia: catálogo de libros y puntos de venta

**Input**: documentos de diseño de `specs/001-book-catalog-stores/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rest-api.md](./contracts/rest-api.md), [contracts/ui-routes.md](./contracts/ui-routes.md) y [quickstart.md](./quickstart.md)

**Tests**: son obligatorios. La constitución (principio VI) exige pruebas unitarias de controladores con mocks de MongoDB, pruebas de integración de los endpoints principales y una cobertura mínima del 70 %. En cada historia, las pruebas se escriben primero y deben fallar antes de implementar.

**Organization**: las tareas se agrupan por historia de usuario para poder implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario a la que pertenece la tarea (US1…US7, igual que en spec.md).

## Convenciones para todas las tareas

- **Rutas**: relativas a `bookia/`. El backend va en `backend/src/` y `backend/tests/`; el frontend, en `frontend/src/` y `frontend/tests/`.
- **Módulos**: ESM (`import`/`export`) en todo el código.
- **Nomenclatura**: identificadores en inglés, rutas Express en `camelCase`, componentes en `PascalCase`, campos de Mongoose y JSON en `snake_case`, y constantes y variables de entorno en `SCREAMING_SNAKE_CASE`. Comentarios en español.
- **Tamaño**: ningún archivo puede superar 300 líneas. Si un archivo se acerca a ese límite, divídelo antes de seguir.
- **Errores**: siempre con `HttpError(status, code, message, details?)` y el formato de `contracts/rest-api.md` § Convenciones.
- **Rutas protegidas**: llevan `authenticate`, `requireRole('admin')` cuando aplica, `validate(schema)` y el controlador, en ese orden.
- **Escrituras con varios documentos**: usan `runInTransaction`, y la auditoría se escribe dentro de la misma transacción.
- **Estilos**: solo clases de Tailwind; nunca el atributo `style` en JSX.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: inicializar el monorepo y las herramientas.

- [ ] T001 Crea `package.json` en la raíz con:
  - `"private": true` y `"workspaces": ["backend", "frontend"]`.
  - Los scripts `dev` (`concurrently` lanza `npm run dev -w backend` y `npm run dev -w frontend`), `lint` (`eslint . && prettier --check .`), `format` (`prettier --write .`), `test` (`npm run test --workspaces`), `seed` (`npm run seed -w backend`), `seed:demo` (`npm run seed:demo -w backend`) y `licenses` (`node scripts/checkLicenses.js`).
  - Como devDependencies: `concurrently`, `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `prettier` y `eslint-config-prettier`.

  Amplía `.gitignore` con `node_modules/`, `.env`, `coverage/` y `dist/`.
- [ ] T002 Crea `backend/package.json` con `"type": "module"`:
  - Dependencias: `express@5`, `mongoose@8`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `helmet`, `express-rate-limit`, `zod`, `dotenv` y `cors`.
  - devDependencies: `vitest`, `@vitest/coverage-v8`, `supertest` y `mongodb-memory-server`.
  - Scripts: `dev` (`node --watch src/server.js`), `start` (`node src/server.js`), `seed` (`node src/scripts/seed.js`), `seed:demo` (`node src/scripts/seedDemo.js`), `test` (`vitest run --coverage`) y `test:watch` (`vitest`).

  Crea vacías las carpetas `src/{config,models,controllers,routes,middlewares,services,validators,jobs,utils,scripts}` y `tests/{unit,integration,helpers}`.
- [ ] T003 [P] Crea el frontend con Vite y React 19 en `frontend/`:
  - `package.json` con las dependencias `react`, `react-dom` y `react-router` (v7), y las devDependencies `vite`, `@vitejs/plugin-react`, `tailwindcss@4`, `@tailwindcss/vite`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` y `@testing-library/jest-dom`.
  - `index.html` con `lang="es"`.
  - `vite.config.js` con los plugins `react()` y `tailwindcss()`, el proxy `server.proxy['/api'] = 'http://localhost:3000'` y un bloque `test` (`environment: 'jsdom'`, `setupFiles: 'tests/setup.js'`, cobertura con umbral del 70 % sobre `src/{hooks,services,utils}`).
  - `src/index.css` con `@import "tailwindcss";`.
  - Las carpetas `src/{components,context,hooks,pages/admin,services,utils}` y `tests/`.
- [ ] T004 [P] Crea `eslint.config.js` (flat config) en la raíz con:
  - `@eslint/js` recommended.
  - Para `frontend/**/*.jsx`: `eslint-plugin-react` y `react-hooks`.
  - `globals.node` para `backend/` y `globals.browser` para `frontend/`.
  - Las reglas `max-lines: ["error", {max: 300}]`, `no-console: ["warn", {allow: ["warn", "error", "info"]}]` y `react/forbid-dom-props: ["error", {forbid: ["style"]}]`.
  - `eslint-config-prettier` al final.

  Crea también `.prettierrc` (`{"singleQuote": true, "semi": true, "printWidth": 100}`) y `.prettierignore` (`coverage`, `dist`, `node_modules`, `specs`).
- [ ] T005 [P] Crea `backend/.env.example` con todas las variables de `quickstart.md` § Configuración (`MONGODB_URI`, `JWT_SECRET`, `BCRYPT_ROUNDS`, `PORT`, `CORS_ORIGIN`, `CURRENCY`, `MAX_ACTIVE_RESERVATIONS`, `PENDING_TTL_DAYS`, `PICKUP_TTL_DAYS`, `EXPIRATION_INTERVAL_MS`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), con valores de ejemplo y un comentario en español sobre cada una.
- [ ] T006 [P] Crea `scripts/checkLicenses.js`. Debe leer las `dependencies` y `devDependencies` de `backend/package.json` y `frontend/package.json`, consultar el campo `license` de cada una en `node_modules/<pkg>/package.json` y fallar (exit 1) si alguna no es `MIT` ni `Apache-2.0`. La única excepción permitida es `dotenv` (BSD-2-Clause), recogida en la constitución 1.0.1. Además, recorre las dependencias transitivas (`npm ls --all --json`) y falla si alguna no tiene una licencia permisiva (`MIT`, `Apache-2.0`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause` o `0BSD`). Al terminar, imprime una tabla con cada dependencia directa y su licencia, y la lista de transitivas que no cumplen.
- [ ] T007 [P] Crea `.github/workflows/ci.yml`: Node 24, `npm ci`, `npm run lint`, `npm test` y `npm run licenses` en cada push y pull request.

---

## Phase 2: Foundational (requisitos que bloquean todo lo demás)

**Purpose**: configuración, conexión, errores, validación, autenticación básica (inicio y cierre de sesión), auditoría, *seed* y el esqueleto de la SPA. El inicio de sesión va aquí porque las historias US2, US3, US5, US6 y US7 lo necesitan. El registro y el bloqueo por intentos fallidos se dejan para US4.

**⚠️ CRITICAL**: no se puede empezar ninguna historia hasta terminar esta fase.

### Backend: base

- [ ] T008 Crea `backend/src/config/env.js`:
  - Llama a `dotenv.config()` y valida `process.env` con `zod`.
  - Obligatorias: `MONGODB_URI`, y `JWT_SECRET` con al menos 32 caracteres.
  - Opcionales con valor por defecto: `BCRYPT_ROUNDS` (12, mínimo 10), `PORT` (3000), `CURRENCY` (`EUR`), `MAX_ACTIVE_RESERVATIONS` (5), `PENDING_TTL_DAYS` (7), `PICKUP_TTL_DAYS` (3), `EXPIRATION_INTERVAL_MS` (60000) y `CORS_ORIGIN`.
  - Exporta un objeto congelado `ENV` con esos nombres. Si falta algo, termina el proceso con un mensaje claro en español.
- [ ] T009 Crea `backend/src/config/db.js`:
  - `connectDb()` llama a `mongoose.set('sanitizeFilter', true)` y `mongoose.set('strictQuery', true)`, y conecta una sola vez a `ENV.MONGODB_URI`.
  - `disconnectDb()` cierra la conexión.
  - Así se cumple el principio IV: un único cliente reutilizado y un cierre controlado.
- [ ] T010 [P] Crea las utilidades de errores y paginación:
  - `backend/src/utils/httpError.js`: clase `HttpError extends Error` con `status`, `code` y `details`.
  - `backend/src/utils/pagination.js`:
    - `parsePagination({page, limit})` con `page` ≥ 1 (1 por defecto) y `limit` 20 por defecto y 50 como máximo.
    - `paginate(model, filter, {sort, projection, page, limit})`, que devuelve `{items, page, limit, total, total_pages}`.
- [ ] T011 [P] Crea las utilidades de búsqueda:
  - `backend/src/utils/normalizeSearch.js`: pasa a minúsculas, aplica `normalize('NFD')`, elimina `/\p{M}/gu`, colapsa los espacios y recorta.
  - `backend/src/utils/escapeRegExp.js`: escapa `.*+?^${}()|[]\`. Ver research R6.
- [ ] T012 [P] Crea `backend/src/utils/isbn.js` con:
  - `normalizeIsbn(value)`: quita los guiones y espacios y pone la `X` en mayúscula.
  - `isValidIsbn(value)`: ISBN-10 (dígito de control módulo 11, `X` solo en la última posición) o ISBN-13 (dígito de control módulo 10 con pesos 1 y 3).
- [ ] T013 Crea `backend/src/middlewares/validate.js`. `validate({body, params, query})` recibe esquemas `zod` y guarda los datos ya validados en `req.validated = {body, params, query}`. En Express 5, `req.query` es de solo lectura, así que no se modifica. Si algo falla, lanza `HttpError(400, 'VALIDATION_ERROR', 'Datos no válidos', details)` con `details = [{field, message}]`.

  Crea también `backend/src/validators/common.js`, con `objectIdSchema` (24 caracteres hexadecimales), `idParamSchema` y `paginationQuerySchema`.
- [ ] T014 Crea los middlewares de errores:
  - `backend/src/middlewares/notFound.js`: responde `404 NOT_FOUND`.
  - `backend/src/middlewares/errorHandler.js`:
    - `HttpError` → su `status` y `code`.
    - `mongoose.Error.ValidationError` → `400 VALIDATION_ERROR` con los `details` de cada ruta.
    - `CastError` → `400 VALIDATION_ERROR`.
    - Error de clave duplicada `11000`, según `keyPattern`: `email` → `409 EMAIL_TAKEN`, `isbn` → `409 ISBN_TAKEN`, `store_id+book_id` → `409 ALREADY_ASSOCIATED`, `user_id+book_id+store_id` → `409 DUPLICATE_RESERVATION`.
    - Cualquier otro error → `500 INTERNAL_ERROR`, registrado con `console.error` y sin exponer la traza.

  El formato de respuesta es siempre `{"error": {code, message, details?}}`.
- [ ] T015 Crea `backend/src/services/transaction.js` con `runInTransaction(fn)`, que abre una sesión, ejecuta `session.withTransaction(() => fn(session))` y la cierra en `finally`. Ver research R8.

### Backend: usuarios, sesión y auditoría

- [ ] T016 [P] Crea `backend/src/models/User.js` según data-model:
  - `name`: "Obligatorio, 1–100 caracteres, sin espacios a los lados".
  - `email`: "Obligatorio, formato de correo, guardado en minúsculas, **único**".
  - `password_hash`: "hash bcrypt con al menos 10 rondas; `select: false`".
  - `role`: enum `user` o `admin`, por defecto `user`.
  - `status`: enum `active` o `disabled`, por defecto `active`.
  - `failed_login_count`: por defecto 0.
  - `locked_until`: Date o null.
  - `active_reservations`: por defecto 0, mínimo 0.
  - `timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}`.
  - Índices `{email: 1}` único y `{role: 1, status: 1}`.
  - `toJSON` devuelve `id` y elimina `_id`, `__v`, `password_hash`, `failed_login_count` y `locked_until`.
- [ ] T017 [P] Crea `backend/src/models/Genre.js` con `name` (obligatorio y único) y `slug` (obligatorio, único y en minúsculas). `toJSON` devuelve `{id, name, slug}`.
- [ ] T018 [P] Crea `backend/src/models/AuditLog.js` según data-model:
  - `user_id`: ObjectId → User, o null.
  - `action`: enum `create`, `update`, `delete`, `status_change` o `role_change`.
  - `entity_type`: enum `book`, `store`, `store_book`, `user` o `reservation`.
  - `entity_id`: obligatorio.
  - `entity_label`: String.
  - `before` y `after`: Mixed o null.
  - `timestamps: {createdAt: 'created_at', updatedAt: false}`.
  - Índices `{created_at: -1}` y `{entity_type: 1, created_at: -1}`.
  - Hooks `pre` en `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany` y `findOneAndDelete` que lanzan `Error('audit_logs es inmutable')` (FR-028).
- [ ] T019 Crea `backend/src/services/auditService.js` con `record({userId, action, entityType, entityId, entityLabel, before, after}, session)`. Debe convertir `before` y `after` a objetos planos, eliminar de ellos `password_hash`, `__v` y cualquier campo `*_search`, y crear el `AuditLog` con `{session}`. Depende de T018.
- [ ] T020 Crea `backend/src/utils/sessionCookie.js`:
  - `SESSION_COOKIE = 'bookia_session'`.
  - `setSessionCookie(res, userId)` firma un JWT con `{sub: userId}`, HS256 y `expiresIn: '24h'`, y lo guarda en una cookie con `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `maxAge` de 24 h y `path: '/'`.
  - `clearSessionCookie(res)` borra la cookie.
  - Ver research R3.
- [ ] T021 Crea los middlewares de sesión y rol:
  - `backend/src/middlewares/authenticate.js`:
    - `authenticate`: lee la cookie, verifica el JWT y carga `User.findById(sub)`. Si no hay token, el token no es válido, el usuario no existe o tiene `status === 'disabled'`, borra la cookie y responde `401 UNAUTHENTICATED`. Si todo va bien, deja el usuario en `req.user`. Así se cumple FR-025: los cambios de rol y estado se aplican en la siguiente acción.
    - `optionalAuthenticate`: hace lo mismo, pero sin fallar; si algo no cuadra, deja `req.user = null`.
  - `backend/src/middlewares/requireRole.js`: `requireRole(...roles)` responde `403 FORBIDDEN` si `req.user.role` no está entre ellos.
- [ ] T022 Crea `backend/src/validators/authValidators.js` con `loginSchema` (`email` como correo, `password` como cadena no vacía). Crea `backend/src/controllers/authController.js` con:
  - `login`: busca por el correo en minúsculas con `+password_hash`. Si no existe o la contraseña no coincide, responde `401 INVALID_CREDENTIALS` con el mensaje "Correo o contraseña incorrectos". Si coincide, llama a `setSessionCookie` y devuelve `UserMe`.
  - `logout`: responde `204` y borra la cookie.
  - `me`: devuelve `UserMe = {id, name, email, role}`.

  El bloqueo por intentos fallidos se añade en US4.
- [ ] T023 Crea:
  - `backend/src/middlewares/rateLimit.js`: `authRateLimit` con `express-rate-limit`, 20 peticiones cada 15 minutos por IP. Al superarlo responde `429 TOO_MANY_REQUESTS` con el formato de error.
  - `backend/src/routes/authRoutes.js`: `POST /login` (con `authRateLimit` y `validate`), `POST /logout` y `GET /me` (con `authenticate` y `requireRole('user', 'admin')`).
  - `backend/src/routes/index.js`: monta los routers bajo `/api` (`/auth`, y más adelante los de cada historia).
- [ ] T024 [P] Crea `backend/src/controllers/configController.js`:
  - `getConfig` devuelve `{currency, max_active_reservations, pending_ttl_days, pickup_ttl_days}` desde `ENV`.
  - `listGenres` devuelve los géneros ordenados por `name`.

  Crea `backend/src/routes/configRoutes.js` con `GET /config` y `GET /genres`, ambas públicas, y móntalo en `routes/index.js`.
- [ ] T025 Crea `backend/src/app.js` con `createApp()`, que monta en este orden: `helmet()`, `express.json({limit: '100kb'})`, `cookieParser()`, `cors({origin: ENV.CORS_ORIGIN, credentials: true})` (solo si existe `CORS_ORIGIN`), las rutas de `/api`, `notFound` y `errorHandler`. No llama a `listen`.

  Crea `backend/src/server.js`, que hace `connectDb()`, `createApp().listen(ENV.PORT)`, y en `SIGINT` y `SIGTERM` cierra el servidor y luego `disconnectDb()`.
- [ ] T026 Crea `backend/src/scripts/seed.js`. Debe ser idempotente:
  1. Conecta a la base de datos.
  2. Hace `syncIndexes()` de todos los modelos importados desde `models/`.
  3. Hace *upsert* por `slug` de estos géneros: Novela, Ciencia ficción, Fantasía, Misterio y suspense, Romántica, Novela histórica, Poesía, Teatro, Ensayo, Biografía y memorias, Infantil, Juvenil, Cómic y novela gráfica, Manga, Autoayuda, Ciencia y divulgación, Historia, Filosofía, Arte, Cocina y Viajes.
  4. Crea el administrador inicial con `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` (hash con `ENV.BCRYPT_ROUNDS`, `role: 'admin'`) si no existe ningún usuario con ese correo.
  5. Desconecta.

  Lee `ADMIN_*` desde `process.env` después de cargar `config/env.js`; si faltan, avisa y no crea el administrador.

### Backend: infraestructura de pruebas

- [ ] T027 Crea:
  - `backend/vitest.config.js`: `environment: 'node'`, `testTimeout: 30000`, `fileParallelism: false` y cobertura v8 con `thresholds: {lines: 70, functions: 70, branches: 70, statements: 70}` sobre `src/{controllers,services,middlewares,utils,jobs}/**`.
  - `backend/tests/helpers/db.js`: `startDb()` arranca `MongoMemoryReplSet` con `replSet: {count: 1}`, fija `process.env.MONGODB_URI` y `JWT_SECRET` de prueba, llama a `connectDb()` y a `syncIndexes()`. También incluye `clearDb()` y `stopDb()`.
  - `backend/tests/helpers/factories.js`: `createUser(overrides)`, `createAdmin()`, `createGenre()`, `createBook(overrides)`, `createStore(overrides)` y `createStoreBook(overrides)`, más `loginAs(app, user, password)`, que devuelve un `supertest.agent` con la cookie.

  Las fábricas de libros y tiendas importan modelos que se crean en US1; hasta entonces, déjalas comentadas con un TODO.
- [ ] T028 [P] Escribe las pruebas unitarias de las utilidades:
  - `backend/tests/unit/utils/isbn.test.js`: ISBN-10 con `X`, ISBN-13 válido e inválido, y entradas con guiones.
  - `backend/tests/unit/utils/normalizeSearch.test.js`: "Cien Años" → "cien anos".
  - `backend/tests/unit/utils/escapeRegExp.test.js`: `.*(`.
  - `backend/tests/unit/utils/pagination.test.js`: valores por defecto y límites.
- [ ] T029 [P] Escribe `backend/tests/integration/auth.session.test.js`:
  - Un inicio de sesión correcto pone una cookie `bookia_session` con `HttpOnly`, `Secure` y `SameSite=Strict`.
  - Una contraseña errónea y un correo inexistente devuelven el mismo `401 INVALID_CREDENTIALS` con el mismo mensaje.
  - `GET /api/auth/me` sin cookie → `401`; con cookie → `UserMe` sin `password_hash`.
  - `logout` borra la cookie.
  - Un usuario desactivado tras iniciar sesión recibe `401` en la siguiente petición.
  - `requireRole('admin')` devuelve `403` a un `user` (con una ruta de prueba montada solo en el test).
- [ ] T030 [P] Escribe `backend/tests/unit/middlewares/errorHandler.test.js` (traducción de cada tipo de error a `code` y `status`, y que nunca expone la traza) y `backend/tests/unit/middlewares/validate.test.js`. Escribe también `backend/tests/unit/controllers/configController.test.js` (con `ENV` y `Genre` mockeados: `getConfig` devuelve los valores de `ENV` y `listGenres` ordena por `name`), porque el principio VI exige pruebas unitarias de todos los controladores.

### Frontend: base

- [ ] T031 [P] Crea `frontend/src/services/apiClient.js` con `apiRequest(path, {method, body, query})`:
  - Usa `fetch('/api' + path)` con `credentials: 'include'`, JSON y construcción de la query con `URLSearchParams`.
  - Si la respuesta no es `ok`, lanza `ApiError {status, code, message, details}` a partir del cuerpo `{error}`.
  - Ante un `401` en cualquier ruta salvo `/auth/login` y `/auth/me`, emite `window.dispatchEvent(new Event('auth:unauthorized'))`.
  - Un `204` devuelve `null`.
- [ ] T032 [P] Crea los servicios básicos:
  - `frontend/src/services/authService.js`: `login`, `logout` y `me`.
  - `frontend/src/services/configService.js`: `getConfig` (con caché en memoria) y `listGenres`.
- [ ] T033 Crea `frontend/src/context/AuthContext.jsx` y `frontend/src/hooks/useAuth.js`. `AuthProvider`:
  - Carga `me()` al montar y guarda `status` (`loading`, `authenticated` o `anonymous`) y `user`.
  - Expone `login`, `logout` y `setUser`.
  - Escucha `auth:unauthorized`: pone `user = null` y navega a `/login?next=<ruta actual>`.
- [ ] T034 [P] Crea las utilidades de formato:
  - `frontend/src/utils/formatPrice.js`: `formatPrice(cents, currency)` con `Intl.NumberFormat('es', {style: 'currency', currency})`.
  - `frontend/src/utils/formatDate.js`: `formatDateTime` con `Intl.DateTimeFormat('es', {dateStyle: 'medium', timeStyle: 'short'})`.
- [ ] T035 [P] Crea los componentes comunes en `frontend/src/components/`:
  - `Layout.jsx` (cabecera, `NavBar` y `<Outlet/>`).
  - `NavBar.jsx` (enlaces según el rol, de momento Catálogo e Iniciar sesión o Cerrar sesión).
  - `RequireAuth.jsx` (redirige a `/login?next=`).
  - `RequireAdmin.jsx` (`RequireAuth` y, si el rol no es `admin`, muestra `ForbiddenPage`).
  - `FormField.jsx` (`label`, `input`, error del campo, `aria-invalid` y `aria-describedby`).
  - `ConfirmDialog.jsx` (diálogo modal accesible con botones Confirmar y Cancelar).
  - `Pagination.jsx`.
  - `ErrorMessage.jsx`.
  - `Spinner.jsx`.

  Todos solo con clases de Tailwind y *responsive* desde 360 px de ancho.
- [ ] T036 Crea `frontend/src/pages/LoginPage.jsx` (formulario de correo y contraseña; muestra `error.message`; tras el inicio de sesión, navega a `next` o a `/`), `frontend/src/pages/NotFoundPage.jsx` y `frontend/src/pages/ForbiddenPage.jsx`.
- [ ] T037 Crea `frontend/src/routes.jsx`, con la tabla de rutas de `contracts/ui-routes.md` (de momento `/`, `/login` y `*` dentro de `Layout`), y `frontend/src/main.jsx`, con `createBrowserRouter`, `RouterProvider` y `AuthProvider`, importando `index.css`.
- [ ] T038 [P] Crea `frontend/tests/setup.js` (`@testing-library/jest-dom/vitest`) y escribe `frontend/tests/services/apiClient.test.js` (con `fetch` mockeado: `ApiError` con su `code`, `204` → `null` y evento ante `401`) y `frontend/tests/utils/formatPrice.test.js`.

**Checkpoint**: la API arranca, `npm run seed` crea los géneros y el administrador, el administrador puede iniciar y cerrar sesión desde la SPA, y `npm run lint` y `npm test` pasan.

---

## Phase 3: User Story 1 - Consultar el catálogo y la disponibilidad de un libro (Priority: P1) 🎯 MVP

**Goal**: cualquier visitante, sin sesión, lista libros, busca por título o autor (sin distinguir mayúsculas ni tildes), filtra por género y ve el detalle con cada tienda, su precio y las unidades disponibles (o "agotado").

**Independent Test**: tras `npm run seed:demo`, un visitante sin cuenta busca "cien anos", abre el libro y ve las tiendas con su dirección, horario, precio y unidades (spec, historia 1).

### Tests for User Story 1 ⚠️

> Escríbelos primero y comprueba que fallan.

- [ ] T039 [P] [US1] Escribe `backend/tests/integration/books.public.test.js`:
  - `GET /api/books` devuelve 20 elementos por página, ordenados por título, con `{items, page, limit, total, total_pages}`.
  - `q=CIEN AÑOS` y `q=cien anos` encuentran "Cien años de soledad".
  - `q=.*(` no da error y busca el texto literal.
  - `genre=novela` combinado con `q` aplica los dos criterios.
  - Un `genre` inexistente devuelve una lista vacía.
  - `GET /api/books/:id` devuelve `stores` con `price_cents` efectivo (el precio de la tienda o, si no tiene, el de referencia), `available = stock − reserved_count` e `is_sold_out`.
  - Un libro sin tiendas devuelve `stores: []`.
  - Un id inexistente → `404`; un id mal formado → `400`.
- [ ] T040 [P] [US1] Escribe `backend/tests/unit/controllers/booksController.test.js` con `vi.mock` de `Book`, `Genre`, `StoreBook` y `Store`: `listBooks` construye el filtro con `title_search` y `author_search` escapados, y `getBook` calcula `available` y `effective price`, y lanza `404`.

### Implementation for User Story 1

- [ ] T041 [P] [US1] Crea `backend/src/models/Book.js` según data-model:
  - `title`: "Obligatorio, 1–300 caracteres".
  - `author`: "Obligatorio, 1–200 caracteres".
  - `genre_id`: "Obligatorio y debe existir" (ref `Genre`).
  - `isbn`: obligatorio y único; se guarda normalizado con `normalizeIsbn` y se valida con `isValidIsbn`.
  - `price_cents`: "Obligatorio, ≥ 0", entero (`Number.isInteger`).
  - `description`: "Opcional, hasta 5000 caracteres".
  - `publisher`: "Opcional, hasta 200 caracteres".
  - `publication_year`: "Opcional, entre 1450 y el año actual + 1", entero.
  - `title_search` y `author_search`: se calculan en `pre('validate')` con `normalizeSearch`.

  Además:
  - Índices `{isbn: 1}` único, `{genre_id: 1, title_search: 1}`, `{title_search: 1}` y `{author_search: 1}`.
  - `toJSON` omite `*_search`, `__v` y `_id`, y añade `id`.
- [ ] T042 [P] [US1] Crea `backend/src/models/Store.js` según data-model:
  - `name`: "Obligatorio, 1–150 caracteres".
  - `address`: "Obligatorio, 1–300 caracteres".
  - `opening_hours`: "Obligatorio, 1–300 caracteres, texto libre".
  - `phone`: "Opcional; dígitos, espacios, `+`, `-` y `()`, hasta 30 caracteres", con la regex `/^[0-9 +\-()]{1,30}$/`.
  - Índice `{name: 1}`, *timestamps* y `toJSON` con `id`.
- [ ] T043 [P] [US1] Crea `backend/src/models/StoreBook.js` (colección `store_books`) según data-model:
  - `store_id` y `book_id`: obligatorios.
  - `stock`: "Obligatorio, ≥ 0", entero.
  - `store_price_cents`: "Opcional, ≥ 0. Si es `null`, se usa `Book.price_cents`", entero o null, por defecto null.
  - `reserved_count`: "Por defecto 0", entero ≥ 0.
  - Validador de documento `reserved_count <= stock`.
  - Índices `{store_id: 1, book_id: 1}` único y `{book_id: 1}`.
  - Exporta los helpers `availableOf(sb)` y `effectivePriceOf(sb, book)`.
- [ ] T044 [US1] Crea `backend/src/validators/bookValidators.js` con `listBooksQuerySchema` (`q` opcional de 1 a 100 caracteres, `genre` opcional con un slug `^[a-z0-9-]+$`, y paginación de `common.js`). Reutiliza `idParamSchema`.
- [ ] T045 [US1] Crea `backend/src/controllers/booksController.js` con:
  - `listBooks`:
    - Resuelve `genre` (slug) a `genre_id`; si no existe, devuelve una página vacía.
    - Normaliza y escapa `q`, y filtra con `{$or: [{title_search: {$regex: term}}, {author_search: {$regex: term}}]}`.
    - Ordena por `{title_search: 1}`, pagina, hace `populate('genre_id', 'name slug')` y devuelve `BookSummary` (`{id, title, author, isbn, genre: {id, name, slug}, price_cents}`).
  - `getBook`:
    - Devuelve `BookDetail` con `stores` construidos desde `StoreBook.find({book_id})` y `Store.find({_id: {$in}})`.
    - Cada tienda es `{store_id, name, address, opening_hours, phone, price_cents, available, is_sold_out}`, ordenadas por `name`.
    - Si el libro no existe, `404 NOT_FOUND` con el mensaje "Libro no encontrado".
- [ ] T046 [US1] Crea `backend/src/routes/booksRoutes.js` con `GET /` y `GET /:id`, ambas públicas y con `validate`, y móntalo en `routes/index.js` como `/books`.
- [ ] T047 [US1] Crea `backend/src/scripts/seedDemo.js` (idempotente, se niega a ejecutarse si `NODE_ENV === 'production'`). Debe crear:
  - 60 libros de varios géneros, entre ellos "Cien años de soledad" (Gabriel García Márquez, ISBN 9780307474728).
  - 5 tiendas.
  - Asociaciones con stock variado, entre ellas una con `stock: 0` (agotado), otra con `store_price_cents` propio y un libro sin ninguna tienda.

  Activa en `backend/tests/helpers/factories.js` las fábricas `createBook`, `createStore` y `createStoreBook`.
- [ ] T048 [P] [US1] Crea `frontend/src/services/booksService.js` con `listBooks({q, genre, page})` y `getBook(id)`.
- [ ] T049 [P] [US1] Crea `frontend/src/hooks/useBooks.js` (lee `q`, `genre` y `page` de `useSearchParams`, llama a `listBooks` y expone `{data, loading, error, setParams, clearFilters}`) y `frontend/src/hooks/useBook.js` (`{book, loading, error, reload}`; un error `404` se marca como `notFound`).
- [ ] T050 [P] [US1] Crea los componentes del catálogo:
  - `frontend/src/components/BookCard.jsx`: título, autor, género y precio formateado; enlaza a `/books/:id`.
  - `frontend/src/components/SearchBar.jsx`: campo con *debounce* de 300 ms y un `label` accesible.
  - `frontend/src/components/GenreFilter.jsx`: `select` cargado con `listGenres`, con la opción "Todos".
  - `frontend/src/components/StoreAvailabilityList.jsx`: muestra cada tienda con nombre, dirección, horario, teléfono y precio, y "Quedan N" o una etiqueta "Agotado".
- [ ] T051 [US1] Crea `frontend/src/pages/CatalogPage.jsx`: `SearchBar` y `GenreFilter` sincronizados con la URL, una rejilla *responsive* de `BookCard`, `Pagination` y, si no hay resultados, un estado vacío "No hay libros que coincidan" con el botón "Limpiar filtros" (historia 1, escenario 6).
- [ ] T052 [US1] Crea `frontend/src/pages/BookDetailPage.jsx`: los datos del libro (título, autor, género, ISBN, precio de referencia, descripción, editorial y año) y `StoreAvailabilityList`. Si no hay tiendas, muestra el aviso "Este libro no está disponible en ningún establecimiento"; si es `notFound`, muestra `NotFoundPage`. Registra `/books/:id` en `frontend/src/routes.jsx`.
- [ ] T053 [P] [US1] Escribe `frontend/tests/hooks/useBooks.test.jsx` (lee y escribe los parámetros de la URL) y `frontend/tests/pages/CatalogPage.test.jsx` (con `booksService` mockeado, muestra el listado, el estado vacío y limpia los filtros).

**Checkpoint**: la US1 funciona sola con los datos de demostración. Es el MVP que se puede enseñar.

---

## Phase 4: User Story 2 - Gestionar libros (Priority: P1)

**Goal**: un administrador crea, edita y elimina libros, con ISBN único y válido, precio ≥ 0 y género de la lista. La baja requiere confirmación y quita el libro de las tiendas, y todo queda auditado.

**Independent Test**: un administrador crea, edita y borra un libro. El catálogo público refleja cada cambio y `audit_logs` tiene 3 entradas (spec, historia 2).

### Tests for User Story 2 ⚠️

- [ ] T054 [P] [US2] Escribe `backend/tests/integration/books.admin.test.js`:
  - `POST /api/books` válido → `201`, y el libro aparece en `GET /api/books`.
  - ISBN repetido (con o sin guiones) → `409 ISBN_TAKEN`.
  - ISBN mal formado, `price_cents` negativo o con decimales, o `genre_id` inexistente → `400` con `details` por campo.
  - `PATCH` cambia los campos y recalcula `title_search`.
  - `GET /:id/deletionImpact` devuelve `{stores, active_reservations: 0, favorites: 0}`.
  - `DELETE` → `204`, borra sus `store_books` y deja 3 entradas en `audit_logs` (`create`, `update` y `delete`, con `before` y `after`).
  - Un usuario `user` → `403` y un anónimo → `401` en `POST`, `PATCH` y `DELETE`.
- [ ] T055 [P] [US2] Escribe `backend/tests/unit/controllers/adminBooksController.test.js` (con modelos y `auditService` mockeados: rama de `genre_id` inexistente, `404` en `update` y `delete`, y llamada a `record` con los datos correctos).

### Implementation for User Story 2

- [ ] T056 [US2] Añade a `backend/src/validators/bookValidators.js`:
  - `createBookSchema`:
    - `title` de 1 a 300 caracteres, `author` de 1 a 200, `genre_id` como ObjectId.
    - `isbn` como cadena que, normalizada, cumple `isValidIsbn` (mensaje "ISBN no válido").
    - `price_cents` entero ≥ 0, `description` hasta 5000, `publisher` hasta 200.
    - `publication_year` entero entre 1450 y el año actual + 1.
    - Recorta los espacios de las cadenas.
  - `updateBookSchema = createBookSchema.partial()`, con al menos un campo.
- [ ] T057 [US2] Crea `backend/src/services/cascadeService.js` con `deleteBookCascade(bookId, actorId, session)`:
  - Borra los `StoreBook` del libro y audita cada uno como `store_book delete`.
  - Borra el libro y lo audita como `book delete`, con su instantánea en `before`.

  Deja un punto de extensión comentado para las reservas (US5) y los favoritos (US6).
- [ ] T058 [US2] Crea `backend/src/controllers/adminBooksController.js` con:
  - `createBook`: comprueba que `genre_id` existe (si no, `400 VALIDATION_ERROR` en el campo `genre_id`), y crea y audita (`create`) en una transacción.
  - `updateBook`: igual, con `before` y `after`.
  - `getDeletionImpact`: devuelve `{stores: StoreBook.countDocuments, active_reservations: 0, favorites: 0}`.
  - `deleteBook`: `runInTransaction(deleteBookCascade)` y `204`.
- [ ] T059 [US2] Añade a `backend/src/routes/booksRoutes.js` las rutas `POST /`, `PATCH /:id`, `GET /:id/deletionImpact` y `DELETE /:id`, todas con `authenticate`, `requireRole('admin')` y `validate`.
- [ ] T060 [P] [US2] Añade a `frontend/src/services/booksService.js` las funciones `createBook`, `updateBook`, `getBookDeletionImpact` y `deleteBook`.
- [ ] T061 [P] [US2] Crea `frontend/src/hooks/useAdminList.js`, un hook genérico para las tablas de administración: carga paginada con `page` y `q` en la URL, y `reload`.
- [ ] T062 [US2] Crea `frontend/src/pages/admin/AdminBooksPage.jsx`:
  - Tabla con título, autor, ISBN y precio, y buscador.
  - Botones Nuevo, Editar y Eliminar.
  - Eliminar abre `ConfirmDialog` con el texto "Se quitará de N establecimientos" a partir de `deletionImpact`.
- [ ] T063 [US2] Crea `frontend/src/pages/admin/BookFormPage.jsx`, que sirve para crear y editar:
  - Campos de US2, con el precio introducido en euros con dos decimales y convertido a céntimos.
  - Validación previa en el cliente (obligatorios, ISBN de 10 o 13 dígitos y precio ≥ 0).
  - Los errores de la API se muestran en cada campo a partir de `details`; `409 ISBN_TAKEN` aparece en el campo ISBN.
- [ ] T064 [US2] Registra `/admin/books`, `/admin/books/new` y `/admin/books/:id/edit` bajo `RequireAdmin` en `frontend/src/routes.jsx`, y añade el enlace "Libros" en `NavBar.jsx` para el rol `admin`.
- [ ] T065 [P] [US2] Escribe `frontend/tests/pages/BookFormPage.test.jsx` (conversión de euros a céntimos, errores de campo desde `details` y redirección tras guardar).

**Checkpoint**: US1 y US2 funcionan. Un administrador mantiene el catálogo.

---

## Phase 5: User Story 3 - Gestionar puntos de venta y su oferta de libros (Priority: P1)

**Goal**: un administrador crea, edita y elimina tiendas, y asocia libros a cada una con stock y precio propio opcional, sin duplicados. Todo queda auditado.

**Independent Test**: un administrador crea una tienda, le asocia un libro con stock 5 y precio 18,50, y el detalle público del libro muestra esa tienda con esos datos (spec, historia 3).

### Tests for User Story 3 ⚠️

- [ ] T066 [P] [US3] Escribe `backend/tests/integration/stores.test.js`:
  - CRUD de tiendas: los campos obligatorios ausentes y un `phone` inválido dan `400`.
  - `GET /api/stores` está paginado y ordenado por `name`.
  - `DELETE` → `204`: borra los `store_books`, los libros siguen existiendo y se audita.
  - Un usuario `user` → `403` y un anónimo → `401` en todas las rutas.
- [ ] T067 [P] [US3] Escribe `backend/tests/integration/storeBooks.test.js`:
  - `POST /api/stores/:id/books` con `{book_id, stock: 5, store_price_cents: 1850}` → `201`, y `GET /api/books/:id` muestra `price_cents: 1850` y `available: 5`.
  - Sin `store_price_cents`, se usa el precio de referencia.
  - Repetir la asociación → `409 ALREADY_ASSOCIATED`.
  - `PATCH` con `store_price_cents: null` quita el precio propio.
  - Con un `StoreBook` con `reserved_count: 2` creado en el *fixture*: `PATCH stock: 1` → `409 STOCK_BELOW_RESERVED` y `DELETE` → `409 HAS_ACTIVE_RESERVATIONS`.
  - Se audita cada operación como `store_book`.
- [ ] T068 [P] [US3] Escribe `backend/tests/unit/controllers/storesController.test.js` y `backend/tests/unit/controllers/storeBooksController.test.js` con modelos mockeados.

### Implementation for User Story 3

- [ ] T069 [P] [US3] Crea `backend/src/validators/storeValidators.js`:
  - `createStoreSchema`: `name` de 1 a 150 caracteres, `address` de 1 a 300, `opening_hours` de 1 a 300 y `phone` opcional con `/^[0-9 +\-()]{1,30}$/`.
  - `updateStoreSchema`: la versión parcial.
  - `storeBookCreateSchema`: `{book_id: ObjectId, stock: entero ≥ 0, store_price_cents?: entero ≥ 0 | null}`.
  - `storeBookUpdateSchema`: `{stock?, store_price_cents?}` con al menos un campo.
  - `storeBookParamsSchema`: `{id, bookId}`.
- [ ] T070 [US3] Crea `backend/src/controllers/storesController.js` con:
  - `listStores`, `getStore`, `createStore` y `updateStore`, auditando en una transacción.
  - `getDeletionImpact`: devuelve `{books: StoreBook.countDocuments({store_id}), active_reservations: 0}`.
  - `deleteStore`.
- [ ] T071 [US3] Añade a `backend/src/services/cascadeService.js` la función `deleteStoreCascade(storeId, actorId, session)`: borra y audita los `StoreBook` de la tienda, y borra y audita la tienda (con `before`). Deja el punto de extensión de reservas para US5.
- [ ] T072 [US3] Crea `backend/src/controllers/storeBooksController.js` con:
  - `listStoreBooks`: página de `StoreBookItem` (`{book_id, title, author, isbn, stock, reserved_count, available, store_price_cents, effective_price_cents}`), ordenada por título.
  - `addStoreBook`: comprueba que existen la tienda y el libro (si no, `404`), y crea y audita.
  - `updateStoreBook`: si `stock < reserved_count`, `409 STOCK_BELOW_RESERVED` con el mensaje "Hay N unidades reservadas". Usa la actualización condicional `{_id, reserved_count: {$lte: stock}}` para evitar carreras, y audita con `before` y `after`.
  - `removeStoreBook`: si `reserved_count > 0`, `409 HAS_ACTIVE_RESERVATIONS`; si no, borra y audita.
- [ ] T073 [US3] Crea `backend/src/routes/storesRoutes.js` con todas las rutas de `contracts/rest-api.md` § Puntos de venta, todas con `authenticate`, `requireRole('admin')` y `validate`. Móntalo en `/stores`.
- [ ] T074 [P] [US3] Crea `frontend/src/services/storesService.js` con el CRUD de tiendas, `deletionImpact` y el CRUD de `/stores/:id/books`.
- [ ] T075 [US3] Crea `frontend/src/pages/admin/AdminStoresPage.jsx` (tabla con `useAdminList`, enlaces a Editar e Inventario, y al eliminar `ConfirmDialog` con "Se quitarán N libros…") y `frontend/src/pages/admin/StoreFormPage.jsx` (nombre, dirección, horario y teléfono, con los errores de cada campo).
- [ ] T076 [US3] Crea `frontend/src/components/BookPicker.jsx`, un buscador de libros por título o autor que usa `listBooks({q})` y devuelve el libro elegido.

  Crea `frontend/src/pages/admin/StoreInventoryPage.jsx`, con la tabla de `StoreBookItem`. En ella:
  - Se pueden editar en línea el stock y el precio de la tienda, en euros; si se deja vacío, se usa el precio de referencia.
  - Se muestran las columnas de reservadas y disponibles.
  - Hay un botón para añadir con `BookPicker`.
  - Se muestran los errores `409` con `error.message`.
- [ ] T077 [US3] Registra `/admin/stores`, `/admin/stores/new`, `/admin/stores/:id/edit` y `/admin/stores/:id/books` bajo `RequireAdmin` en `frontend/src/routes.jsx`, y añade el enlace "Establecimientos" en `NavBar.jsx` para `admin`.
- [ ] T078 [P] [US3] Escribe `frontend/tests/pages/StoreInventoryPage.test.jsx` (con el servicio mockeado: edita el stock, muestra `409` y el precio vacío envía `null`).

**Checkpoint**: las tres historias P1 funcionan. Bookia responde "dónde está este libro" con datos que mantienen los administradores.

---

## Phase 6: User Story 4 - Registrarse e iniciar sesión (Priority: P2)

**Goal**: cualquiera puede crear una cuenta (rol `user`) con nombre, correo y contraseña segura. El inicio de sesión bloquea la cuenta 15 minutos tras 5 fallos seguidos, sin revelar qué correos existen.

**Independent Test**: registrar una cuenta, cerrar sesión, volver a entrar y comprobar que la app reconoce al usuario. 5 fallos seguidos bloquean la cuenta (spec, historia 4).

### Tests for User Story 4 ⚠️

- [ ] T079 [P] [US4] Escribe `backend/tests/integration/auth.register.test.js`:
  - Un registro válido → `201`, cookie, `role: 'user'` y sin `password_hash`. En la base de datos, el hash empieza por `$2` y tiene un coste ≥ 10.
  - Repetir el correo con otras mayúsculas → `409 EMAIL_TAKEN`.
  - Contraseñas `abcdefgh` (sin números), `1234567` (corta) y `12345678` (sin letras) → `400` en el campo `password`.
  - Un `role: 'admin'` en el cuerpo se ignora.
- [ ] T080 [P] [US4] Escribe `backend/tests/integration/auth.lockout.test.js`:
  - 5 fallos seguidos fijan `locked_until`.
  - El 6.º intento, aunque la contraseña sea correcta, devuelve `401 INVALID_CREDENTIALS` con el mismo mensaje.
  - Tras poner `locked_until` en el pasado, el inicio de sesión funciona y `failed_login_count` vuelve a 0.
  - Un correo inexistente responde igual.
- [ ] T081 [P] [US4] Escribe `backend/tests/unit/controllers/authController.test.js` (`User` y `bcrypt` mockeados: se compara contra el hash ficticio cuando no existe el usuario, se incrementa el contador y se bloquea en el 5.º fallo).

### Implementation for User Story 4

- [ ] T082 [US4] Añade a `backend/src/validators/authValidators.js` el `registerSchema`: `name` de 1 a 100 caracteres recortado, `email` como correo recortado y en minúsculas, y `password` con al menos 8 caracteres y `/[A-Za-z]/` y `/[0-9]/` (mensaje "La contraseña debe tener al menos 8 caracteres, con letras y números"). Usa `.strict()` o descarta cualquier campo extra, como `role`.
- [ ] T083 [US4] Añade a `backend/src/controllers/authController.js`:
  - `register`: hash con `ENV.BCRYPT_ROUNDS`, crea con `role: 'user'`, llama a `setSessionCookie` y responde `201 UserMe`.
  - Cambios en `login`:
    - Si el usuario no existe, compara con `DUMMY_HASH`, una constante calculada al cargar el módulo.
    - Si `locked_until > now`, responde `401` genérico sin comparar.
    - Si falla, incrementa `failed_login_count` con `$inc`; al llegar a 5, fija `locked_until = now + 15 min` y pone el contador a 0.
    - Si acierta, pone `failed_login_count` a 0 y `locked_until` a null.
    - Una cuenta `disabled` también recibe `401` genérico.
- [ ] T084 [US4] Añade `POST /register` (con `authRateLimit` y `validate(registerSchema)`) a `backend/src/routes/authRoutes.js`.
- [ ] T085 [P] [US4] Añade `register` a `frontend/src/services/authService.js` y a `AuthContext`.
- [ ] T086 [US4] Crea `frontend/src/pages/RegisterPage.jsx`: nombre, correo, contraseña y confirmación de contraseña; validación de la política en el cliente con el mismo mensaje que la API, y errores por campo desde `details`. Tras registrarse, navega a `next` o a `/`.

  Registra `/register` en `frontend/src/routes.jsx`. En `NavBar.jsx`, el visitante ve "Iniciar sesión" y "Crear cuenta", y el usuario con sesión ve su nombre y "Cerrar sesión".
- [ ] T087 [P] [US4] Escribe `frontend/tests/pages/RegisterPage.test.jsx` (validación de la política, `409` en el campo de correo y redirección).

**Checkpoint**: cualquiera puede crear su cuenta; las historias anteriores siguen funcionando.

---

## Phase 7: User Story 5 - Reservar un libro en un punto de venta (Priority: P2)

**Goal**: un usuario registrado reserva una unidad en una tienda con existencias, nunca por encima del stock. Ve y cancela sus reservas. El administrador las marca como listas y como recogidas, y las vencidas caducan solas. Las bajas de libros y tiendas cancelan las reservas activas.

**Independent Test**: con un libro con 1 unidad en una tienda, un usuario lo reserva y la tienda aparece como "agotado". El administrador marca la reserva como lista y como recogida, y el usuario ve cada estado en "Mis reservas" (spec, historia 5).

**Depende de**: US3 (`StoreBook`) y US4 (cuentas `user`; para las pruebas basta con las fábricas).

### Tests for User Story 5 ⚠️

- [ ] T088 [P] [US5] Escribe `backend/tests/integration/reservations.user.test.js`:
  - `POST /api/reservations` → `201` en estado `pending` con `expires_at` a 7 días, y el detalle del libro muestra `available` reducido en 1.
  - Una tienda agotada → `409 OUT_OF_STOCK`.
  - El mismo libro en la misma tienda con una reserva activa → `409 DUPLICATE_RESERVATION`.
  - La 6.ª reserva activa → `409 RESERVATION_LIMIT`, con un mensaje que incluye el número de reservas activas y el máximo.
  - Un libro no asociado a la tienda → `404`.
  - `GET /mine` solo devuelve las reservas propias, de la más reciente a la más antigua.
  - Cancelar una reserva propia → `cancelled` con `cancel_reason: 'user'` y la unidad liberada.
  - Cancelar la de otro usuario → `403`.
  - Cancelar dos veces → `409 INVALID_TRANSITION`.
  - Un anónimo → `401`.
- [ ] T089 [P] [US5] Escribe `backend/tests/integration/reservations.concurrency.test.js`: con `stock: 1`, lanza 20 usuarios distintos haciendo `POST /api/reservations` con `Promise.all`. Debe haber exactamente 1 `201` y 19 `409 OUT_OF_STOCK`, y al final `reserved_count === 1` (SC-009).
- [ ] T090 [P] [US5] Escribe `backend/tests/integration/reservations.admin.test.js`:
  - `ready` → `expires_at` a 3 días y `ready_at`.
  - `pickup` → `stock −1`, `reserved_count −1`, `active_reservations −1` y estado `picked_up`.
  - `pickup` sobre una reserva `pending` → `409 INVALID_TRANSITION`.
  - `GET /api/reservations?status=pending&store_id=` filtra correctamente.
  - Una cancelación por el administrador → `cancel_reason: 'admin'`.
  - Cada transición del administrador crea un `AuditLog` (`reservation`, `status_change`).
  - Un `user` → `403` en las rutas de administración.
- [ ] T091 [P] [US5] Escribe `backend/tests/integration/reservations.cascade.test.js`:
  - Borrar un libro con reservas activas: pasan a `cancelled` (`book_deleted`), se liberan los `active_reservations` de los usuarios, se audita, y `deletionImpact.active_reservations` coincide.
  - Lo mismo al borrar una tienda (`store_deleted`).
  - Las reservas conservan `book_title`, `store_name` y `price_cents` aunque cambie después el precio de la tienda.
- [ ] T092 [P] [US5] Escribe `backend/tests/unit/services/reservationService.test.js` (tabla de transiciones válidas e inválidas; `expireOverdue` caduca solo las vencidas que cumplen el filtro; reservar una unidad ocupada por una reserva vencida devuelve `201`; cancelar una reserva vencida devuelve `409 INVALID_TRANSITION` y la deja en `expired`) y `backend/tests/unit/jobs/expireReservations.test.js` (contra la base de datos en memoria: ejecutado dos veces, produce una sola transición y un solo `AuditLog`, y libera los contadores).
- [ ] T093 [P] [US5] Escribe `backend/tests/unit/controllers/reservationsController.test.js` con el servicio mockeado.

### Implementation for User Story 5

- [ ] T094 [P] [US5] Crea `backend/src/models/Reservation.js` según data-model:
  - Campos `user_id`, `book_id` y `store_id`, obligatorios.
  - Copias `book_title`, `store_name` y `store_address`.
  - `price_cents`: entero ≥ 0.
  - `status`: enum `pending`, `ready`, `picked_up`, `cancelled` o `expired`.
  - `is_active`: "`true` si `status ∈ {pending, ready}`".
  - `expires_at`, `ready_at` y `closed_at`: Date o null.
  - `cancel_reason`: enum `user`, `admin`, `book_deleted`, `store_deleted`, `account_deactivated` o null.
  - Índices:
    - `{user_id: 1, book_id: 1, store_id: 1}` único con `partialFilterExpression: {is_active: true}`.
    - `{user_id: 1, created_at: -1}`.
    - `{status: 1, store_id: 1, created_at: -1}`.
    - `{is_active: 1, expires_at: 1}`.
    - `{book_id: 1, is_active: 1}`.
    - `{store_id: 1, is_active: 1}`.
- [ ] T095 [US5] Crea `backend/src/services/reservationService.js` con:
  - `createReservation({user, bookId, storeId})`, dentro de `runInTransaction`:
    1. Carga el `StoreBook` y el libro (si falta alguno, `404`).
    2. `StoreBook.findOneAndUpdate({_id, $expr: {$lt: ['$reserved_count', '$stock']}}, {$inc: {reserved_count: 1}})`; si no hay resultado, `409 OUT_OF_STOCK`.
    3. `User.updateOne({_id, active_reservations: {$lt: ENV.MAX_ACTIVE_RESERVATIONS}}, {$inc: {active_reservations: 1}})`; si no modifica nada, `409 RESERVATION_LIMIT` con el mensaje «Ya tienes N reservas activas; el máximo es M» (caso límite de la spec).
    4. Crea la reserva en `pending` con `expires_at = now + PENDING_TTL_DAYS`, las copias y el precio efectivo.
  - `transition(reservationId, to, {actor, reason})`: valida contra la tabla de transiciones de data-model; usa una actualización condicional sobre el `status` de origen (si no la encuentra, `409 INVALID_TRANSITION`); ajusta los contadores según esa tabla (`pickup` resta `stock` y `reserved_count`; `cancel` y `expire` liberan `reserved_count` solo si el `StoreBook` existe); y audita si el actor es un administrador o el sistema.
  - `cancelActiveFor(filter, reason, actorId, session)`: lo usan las cascadas.
  - `expireOverdue(filter, session)`: caduca con `transition(…, 'expired')` las reservas activas vencidas (`expires_at <= now`) que cumplen el filtro. Se llama:
    - En `createReservation`, antes del paso 2, con `{store_id, book_id}` y con `{user_id}`.
    - En `transition`: si la reserva está activa y vencida, la caduca y responde `409 INVALID_TRANSITION` con el mensaje «La reserva ha caducado».
    - En `listMine` (con `{user_id}`) y en `listAll` (con el filtro de la consulta), antes de leer.
  - `toPublic(reservation)`: da la forma del contrato; no cambia el estado. Ver research R9.

  Si el archivo supera 300 líneas, separa `reservationTransitions.js`.
- [ ] T096 [US5] Crea `backend/src/jobs/expireReservations.js`:
  - `runExpiration(now)` busca `{is_active: true, expires_at: {$lte: now}}` en lotes de 100 y llama a `transition(id, 'expired', {actor: null})`, ignorando `INVALID_TRANSITION`.
  - `startExpirationJob()` usa `setInterval(runExpiration, ENV.EXPIRATION_INTERVAL_MS)` y devuelve `stop()`.

  En `backend/src/server.js`, arranca el job tras conectar y páralo en el cierre.
- [ ] T097 [US5] Extiende `backend/src/services/cascadeService.js`: `deleteBookCascade` y `deleteStoreCascade` llaman a `cancelActiveFor({book_id})` y `cancelActiveFor({store_id})` con `book_deleted` y `store_deleted` antes de borrar los `StoreBook`. Actualiza `getDeletionImpact` en `adminBooksController.js` y `storesController.js` para que cuente `Reservation.countDocuments({..., is_active: true})`.
- [ ] T098 [US5] Crea `backend/src/validators/reservationValidators.js` (`createReservationSchema {book_id, store_id}` y `listReservationsQuerySchema {status?, store_id?, page, limit}`) y `backend/src/controllers/reservationsController.js` con:
  - `create` y `listMine`.
  - `cancel`: permitido al titular o a un administrador; si no, `403`; `reason` es `user` o `admin`.
  - `listAll`, solo para administradores, con `populate` de `{id, name, email}` del usuario.
  - `markReady` y `markPickedUp`.

  Todas las respuestas pasan por `toPublic`.
- [ ] T099 [US5] Crea `backend/src/routes/reservationsRoutes.js`:
  - `POST /`, `GET /mine` y `POST /:id/cancel` con `authenticate` y `requireRole('user', 'admin')`.
  - `GET /`, `POST /:id/ready` y `POST /:id/pickup` con `authenticate` y `requireRole('admin')`.

  Móntalo en `/reservations`.
- [ ] T100 [P] [US5] Crea `frontend/src/services/reservationsService.js` (`createReservation`, `listMyReservations`, `cancelReservation`, `listReservations`, `markReady` y `markPickedUp`) y `frontend/src/utils/reservationStatusLabel.js`:
  - Estados: `pending` → "Pendiente", `ready` → "Lista para recoger", `picked_up` → "Recogida", `cancelled` → "Cancelada" y `expired` → "Caducada".
  - Motivos de cancelación: "por ti", "por la administración", "libro retirado", "establecimiento cerrado" y "cuenta desactivada".
- [ ] T101 [P] [US5] Crea `frontend/src/hooks/useReservations.js` (`{items, loading, error, cancel, reload}`) y `frontend/src/components/StatusBadge.jsx` (una etiqueta de color por estado, con texto y no solo color).
- [ ] T102 [US5] Crea `frontend/src/components/ReserveButton.jsx`:
  - Un anónimo va a `/login?next=/books/:id`.
  - Si la tienda está agotada, no se muestra.
  - Pulsarlo abre `ConfirmDialog` con el precio y el plazo de 7 días.
  - Si va bien, recarga el libro y muestra un enlace a "Mis reservas"; si hay `409`, muestra `error.message`.

  Intégralo en `StoreAvailabilityList.jsx`.
- [ ] T103 [US5] Crea `frontend/src/pages/MyReservationsPage.jsx`: lista con libro, tienda y dirección, precio, `StatusBadge`, fecha de creación y fecha límite si está en `ready`, motivo si está `cancelled`, botón Cancelar con confirmación en las activas, filtro por estado y paginación.
- [ ] T104 [US5] Crea `frontend/src/pages/admin/AdminReservationsPage.jsx`: tabla filtrable por estado y tienda (`select` cargado con `listStores`) con usuario, libro, tienda, estado y fechas, y las acciones "Marcar lista", "Marcar recogida" y "Cancelar" según el estado, con confirmación.
- [ ] T105 [US5] Registra `/me/reservations` (con `RequireAuth`) y `/admin/reservations` (con `RequireAdmin`) en `frontend/src/routes.jsx`, y añade los enlaces "Mis reservas" y "Reservas" en `NavBar.jsx`.
- [ ] T106 [P] [US5] Escribe `frontend/tests/components/ReserveButton.test.jsx` (redirección del anónimo, oculto si está agotado y error `409`) y `frontend/tests/pages/MyReservationsPage.test.jsx` (cancelar y mostrar los motivos).

**Checkpoint**: las reservas funcionan de principio a fin, sin sobrerreservas y con caducidad automática.

---

## Phase 8: User Story 6 - Guardar libros favoritos (Priority: P3)

**Goal**: un usuario registrado marca y desmarca favoritos y los consulta con su disponibilidad actual.

**Independent Test**: marcar 2 favoritos, cerrar sesión, volver a entrar y verlos; quitar uno y que desaparezca (spec, historia 6).

### Tests for User Story 6 ⚠️

- [ ] T107 [P] [US6] Escribe `backend/tests/integration/favorites.test.js`:
  - `PUT /api/favorites/:bookId` dos veces → `204` y un solo documento.
  - `GET` devuelve `BookSummary` con `stores_available`.
  - `DELETE` es idempotente.
  - Un libro inexistente → `404`.
  - Cada usuario solo ve los suyos.
  - Un anónimo → `401`.
  - Al borrar el libro desaparece de los favoritos, y `deletionImpact.favorites` lo contaba.
  - `GET /api/books` con sesión incluye `is_favorite`; sin sesión, no.
- [ ] T108 [P] [US6] Escribe `backend/tests/unit/controllers/favoritesController.test.js`.

### Implementation for User Story 6

- [ ] T109 [P] [US6] Crea `backend/src/models/Favorite.js` (`user_id` y `book_id` obligatorios; índices `{user_id: 1, book_id: 1}` único y `{book_id: 1}`; *timestamps*).
- [ ] T110 [US6] Crea `backend/src/controllers/favoritesController.js`:
  - `listFavorites`: página de `BookSummary`, donde `stores_available` es el número de `StoreBook` del libro con `stock > reserved_count`.
  - `addFavorite`: `updateOne` con `upsert` y `204`.
  - `removeFavorite`: `deleteOne` y `204`.

  Crea `backend/src/routes/favoritesRoutes.js` (todo con `authenticate` y `requireRole('user', 'admin')`) y móntalo en `/favorites`.
- [ ] T111 [US6] Extiende `deleteBookCascade` en `backend/src/services/cascadeService.js` para que borre los `Favorite` del libro. Actualiza `getDeletionImpact` en `adminBooksController.js` para que cuente los favoritos.
- [ ] T112 [US6] En `backend/src/routes/booksRoutes.js`, aplica `optionalAuthenticate` a `GET /` y `GET /:id`. En `booksController.js`, si hay `req.user`, añade `is_favorite` consultando `Favorite.find({user_id, book_id: {$in: ids}})` una sola vez por página.
- [ ] T113 [P] [US6] Crea `frontend/src/services/favoritesService.js` y `frontend/src/hooks/useFavorites.js` (con *toggle* optimista que se revierte si falla).
- [ ] T114 [US6] Crea `frontend/src/components/FavoriteButton.jsx` (icono de corazón accesible con `aria-pressed` y `aria-label` "Añadir a favoritos" o "Quitar de favoritos"; un anónimo va a `/login?next=`) e intégralo en `BookCard.jsx` y `BookDetailPage.jsx`.
- [ ] T115 [US6] Crea `frontend/src/pages/MyFavoritesPage.jsx`: rejilla de `BookCard` con "Disponible en N establecimientos" o "Sin existencias", estado vacío y paginación. Registra `/me/favorites` con `RequireAuth` en `frontend/src/routes.jsx` y añade el enlace "Mis favoritos" en `NavBar.jsx`.
- [ ] T116 [P] [US6] Escribe `frontend/tests/hooks/useFavorites.test.jsx` (*toggle* optimista y reversión si falla).

**Checkpoint**: los favoritos funcionan sin afectar a las demás historias.

---

## Phase 9: User Story 7 - Administrar usuarios y consultar la auditoría (Priority: P3)

**Goal**: un administrador lista usuarios, cambia su rol, los desactiva o reactiva (siempre queda al menos un administrador activo) y consulta la auditoría filtrada.

**Independent Test**: un administrador promueve a un usuario; ese usuario accede a la gestión de libros; la auditoría muestra el cambio de rol y lo que haga después el nuevo administrador (spec, historia 7).

### Tests for User Story 7 ⚠️

- [ ] T117 [P] [US7] Escribe `backend/tests/integration/users.test.js`:
  - `GET /api/users?q=` busca por nombre o correo y nunca devuelve `password_hash`.
  - `PATCH role: 'admin'`: en la siguiente petición, el usuario promovido pasa `requireRole`.
  - `PATCH status: 'disabled'`: su siguiente petición da `401` y sus reservas activas pasan a `cancelled` (`account_deactivated`) con las unidades liberadas.
  - Degradar o desactivar al único administrador activo → `409 LAST_ADMIN`.
  - Se audita como `role_change` y `status_change`.
  - Un `user` → `403`.
- [ ] T118 [P] [US7] Escribe `backend/tests/integration/auditLogs.test.js`:
  - Orden de la más reciente a la más antigua y filtro `entity_type`.
  - `user` con `{id, name}` o `null` si la acción es del sistema.
  - `PUT`, `PATCH` y `DELETE /api/auditLogs/:id` → `404`.
  - `AuditLog.updateOne(...)` lanza un error (FR-028).
- [ ] T119 [P] [US7] Escribe `backend/tests/unit/controllers/usersController.test.js` y `backend/tests/unit/controllers/auditLogsController.test.js`.

### Implementation for User Story 7

- [ ] T120 [P] [US7] Crea `backend/src/validators/userValidators.js`: `listUsersQuerySchema {q? (1–100), page, limit}` y `updateUserSchema {role?: 'user'|'admin', status?: 'active'|'disabled'}` con al menos un campo.
- [ ] T121 [US7] Añade a `backend/src/services/cascadeService.js` la función `deactivateUserCascade(userId, actorId, session)`, que llama a `cancelActiveFor({user_id}, 'account_deactivated', ...)`. Si la US5 no está implementada, la llamada se omite.
- [ ] T122 [US7] Crea `backend/src/controllers/usersController.js`:
  - `listUsers`: escapa `q`, busca con regex sin distinguir mayúsculas en `name` y `email`, y ordena por `created_at` descendente.
  - `updateUser`, en una transacción:
    1. Si el cambio quita el rol `admin` o desactiva a un administrador, cuenta `User.countDocuments({role: 'admin', status: 'active', _id: {$ne: id}})`; si es 0, `409 LAST_ADMIN` con el mensaje "Debe quedar al menos un administrador activo".
    2. Aplica el cambio.
    3. Si se desactiva la cuenta, ejecuta `deactivateUserCascade`.
    4. Audita como `role_change` o `status_change`, con `before` y `after` que solo contienen `{role, status}`.
- [ ] T123 [US7] Crea `backend/src/controllers/auditLogsController.js` (`listAuditLogs` con filtro `entity_type` validado contra el enum, `populate('user_id', 'name')`, orden `created_at: -1` y paginación). Crea `backend/src/routes/usersRoutes.js` y `backend/src/routes/auditLogsRoutes.js`, ambos con `authenticate` y `requireRole('admin')`, y móntalos en `/users` y `/auditLogs`.
- [ ] T124 [P] [US7] Crea `frontend/src/services/usersService.js` y `frontend/src/services/auditLogsService.js`.
- [ ] T125 [US7] Crea `frontend/src/pages/admin/AdminUsersPage.jsx`: tabla con nombre, correo, rol, estado y fecha de alta, y un buscador. Las acciones son cambiar el rol y desactivar o reactivar, con confirmación; si se va a desactivar, la confirmación avisa de que se cancelarán sus reservas. El error `409 LAST_ADMIN` se muestra con su mensaje.
- [ ] T126 [US7] Crea `frontend/src/pages/admin/AuditLogPage.jsx`: tabla con fecha y hora, usuario (o "Sistema"), acción, tipo y elemento, y filtro por tipo. Cada fila se puede desplegar para ver `before` y `after` como una lista de campos que cambian.

  Registra `/admin/users` y `/admin/audit` con `RequireAdmin` en `frontend/src/routes.jsx`, y añade los enlaces "Usuarios" y "Auditoría" en `NavBar.jsx`.
- [ ] T127 [P] [US7] Escribe `frontend/tests/pages/AdminUsersPage.test.jsx` (confirmación al desactivar y mensaje de `LAST_ADMIN`).

**Checkpoint**: las 7 historias funcionan.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones transversales y puertas de calidad de la constitución.

- [ ] T128 [P] Escribe `backend/tests/integration/authorization.test.js`: una tabla de todas las rutas de gestión de `contracts/rest-api.md` contra los roles anónimo, `user` y `admin`. Comprueba que los anónimos reciben `401` y los `user`, `403`, en todas (SC-006, FR-007). Además, recorre la pila de Express (`app.router.stack`) y comprueba que toda ruta que lleva `authenticate` lleva también `requireRole` (principio II).
- [ ] T129 [P] Escribe `backend/tests/integration/performance.test.js`:
  - Inserta 10 000 libros y 500 tiendas con `insertMany`.
  - Comprueba con `explain('executionStats')` que las consultas de `listBooks` (con `q`, con `genre` y con ambos) y del detalle no usan `COLLSCAN`.
  - Mide que `GET /api/books?q=` y `GET /api/books/:id` responden en menos de 200 ms (mediana de 10 peticiones).
  - Con 200 usuarios y 5 000 reservas, mide que `POST /api/reservations`, `GET /api/reservations/mine`, `GET /api/reservations` (administración) y `GET /api/auditLogs` responden en menos de 200 ms (mediana de 10 peticiones).
  - Mide el borrado de un libro con 50 reservas activas. Si supera 200 ms, anótalo en `plan.md` § Complexity Tracking como operación de administración poco frecuente, fuera de las «condiciones normales» del principio IV.
- [ ] T130 Ejecuta `npm run lint`, corrige todas las advertencias y comprueba que ningún archivo supera 300 líneas.
- [ ] T131 Ejecuta `npm test` y sube la cobertura hasta el umbral del 70 % en el backend (`controllers`, `services`, `middlewares`, `utils` y `jobs`) y en el frontend (`hooks`, `services` y `utils`).
- [ ] T132 [P] Ejecuta `npm run licenses` y confirma que la única excepción directa es `dotenv` y que todas las transitivas tienen licencia permisiva.
- [ ] T133 [P] Revisa la accesibilidad y el diseño *responsive* de todas las páginas a 360 px y en escritorio: `label` en todos los campos, foco visible, `ConfirmDialog` con foco atrapado y cierre con Esc, y estados que no dependen solo del color. Corrige lo que falle en `frontend/src/components/` y `frontend/src/pages/`.
- [ ] T134 [P] Crea `README.md` en `bookia/`, en español: qué es Bookia, requisitos, cómo arrancar (remitiendo a `specs/001-book-catalog-stores/quickstart.md`), scripts y estructura de carpetas.
- [ ] T135 Recorre a mano los 8 escenarios de `specs/001-book-catalog-stores/quickstart.md` § Escenarios de validación manual y anota cualquier diferencia en `specs/001-book-catalog-stores/checklists/validation.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (fase 1)**: no tiene dependencias.
- **Foundational (fase 2)**: depende de la fase 1 y **bloquea todas las historias**.
- **Historias (fases 3 a 9)**: todas dependen de la fase 2.
- **Polish (fase 10)**: depende de las historias que se quieran entregar.

### User Story Dependencies

| Historia | Depende de | Notas |
|----------|------------|-------|
| US1 (P1) catálogo | Fase 2 | Crea los modelos `Book`, `Store` y `StoreBook`, y los datos de demostración. |
| US2 (P1) libros | US1 (modelo `Book`) | Crea `cascadeService`. |
| US3 (P1) tiendas | US1 (modelos `Store` y `StoreBook`) | Puede ir en paralelo con US2; las dos tocan `cascadeService.js` (funciones distintas), así que conviene coordinarse. |
| US4 (P2) registro | Fase 2 | Independiente de US1 a US3; puede ir en paralelo con ellas. |
| US5 (P2) reservas | US3 y US4 | Extiende las cascadas de US2 y US3. |
| US6 (P3) favoritos | US1 (y US2 para la cascada) | Independiente de US5. |
| US7 (P3) usuarios y auditoría | Fase 2 | La cancelación en cascada al desactivar requiere US5 (T121 la omite si no existe). |

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- El orden es: modelos, validadores, servicios, controladores, rutas, servicios del frontend, hooks y componentes, páginas y rutas de la SPA.
- Cada historia se cierra con su checkpoint antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- **Fase 1**: T003 a T007 en paralelo, después de T001 y T002.
- **Fase 2**:
  - T010, T011 y T012 (utilidades), T016, T017 y T018 (modelos) y T024 en paralelo.
  - El frontend (T031 a T038) puede avanzar en paralelo con el backend desde T031.
- **Historias**:
  - Las pruebas marcadas con [P] de cada historia, en paralelo.
  - Los modelos T041, T042 y T043, en paralelo.
  - Tras la fase 2, US4 puede ir en paralelo con US1 a US3. Tras US1, US2, US3 y US6 pueden avanzar en paralelo (coordinando `cascadeService.js`).

---

## Parallel Example: User Story 1

```text
# Pruebas de US1 en paralelo:
Task: "T039 Integración del catálogo público en backend/tests/integration/books.public.test.js"
Task: "T040 Unitarias de booksController en backend/tests/unit/controllers/booksController.test.js"

# Modelos de US1 en paralelo:
Task: "T041 Modelo Book en backend/src/models/Book.js"
Task: "T042 Modelo Store en backend/src/models/Store.js"
Task: "T043 Modelo StoreBook en backend/src/models/StoreBook.js"

# Frontend de US1 en paralelo (con los contratos ya fijados):
Task: "T048 booksService en frontend/src/services/booksService.js"
Task: "T049 useBooks y useBook en frontend/src/hooks/"
Task: "T050 BookCard, SearchBar, GenreFilter y StoreAvailabilityList en frontend/src/components/"
```

## Parallel Example: User Story 5

```text
Task: "T088 Integración de reservas de usuario en backend/tests/integration/reservations.user.test.js"
Task: "T089 Concurrencia de la última unidad en backend/tests/integration/reservations.concurrency.test.js"
Task: "T090 Transiciones del administrador en backend/tests/integration/reservations.admin.test.js"
Task: "T091 Cascadas con reservas en backend/tests/integration/reservations.cascade.test.js"
Task: "T092 Unitarias de reservationService y del job de caducidad"
```

---

## Implementation Strategy

### MVP First (solo User Story 1)

1. Fase 1 (Setup) y fase 2 (Foundational).
2. Fase 3 (US1) con datos de `npm run seed:demo`.
3. **PARAR Y VALIDAR**: escenario 1 del quickstart.
4. Demostración: el catálogo público con la disponibilidad por tienda.

### Incremental Delivery

1. Setup y Foundational: la base está lista.
2. US1: MVP del catálogo público.
3. US2 y US3: los administradores mantienen los datos reales (completa el P1).
4. US4: registro abierto.
5. US5: reservas (el mayor valor del P2).
6. US6 y US7: favoritos, gestión de usuarios y auditoría.
7. Polish: las puertas de calidad de la constitución antes de dar la feature por terminada.

### Parallel Team Strategy

Con varias personas, tras la fase 2:

- **Persona A**: US1, luego US2 y luego US6.
- **Persona B**: US4, luego US3 y luego US5.
- **Persona C**: el frontend de las historias que ya tengan el backend, y US7.

---

## Notes

- Cada tarea cita el archivo exacto que crea o modifica. Si una tarea nombra un archivo que ya existe, se amplía; no se sustituye.
- Las restricciones entre comillas proceden literalmente de `data-model.md`. No las relajes al implementar.
- Haz un commit (en español) al terminar cada tarea o grupo lógico; el proyecto aún no tiene git: inicialízalo antes de T001 si se quiere control de versiones.
- Antes de marcar cualquier tarea como hecha: lint sin advertencias, pruebas en verde y cumplimiento de la constitución.
