# Implementation Plan: Bookia: catálogo de libros y puntos de venta

**Branch**: `001-book-catalog-stores` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-book-catalog-stores/spec.md`

## Summary

Bookia es una aplicación web en la que cualquiera consulta el catálogo de libros y ve en qué puntos de venta están, con el precio y las unidades disponibles en cada uno. Los usuarios registrados guardan favoritos y reservan un ejemplar para recogerlo y pagarlo en la tienda. Los administradores gestionan libros, tiendas, inventario, reservas y usuarios, y todo cambio crítico queda auditado.

Enfoque técnico:

- API REST con Express 5 y Mongoose 8 sobre MongoDB (*replica set*), y SPA en React 19 con Vite, React Router 7 y Tailwind 4, en un monorepo con workspaces de npm.
- Las reservas evitan la sobrerreserva con contadores (`reserved_count`) actualizados de forma condicional dentro de transacciones. Las mismas transacciones escriben la auditoría y aplican las bajas en cascada.
- La búsqueda parcial sin mayúsculas ni tildes usa campos normalizados con índice.
- Un job en proceso caduca las reservas vencidas.

El detalle está en [research.md](./research.md).

## Technical Context

**Language/Version**: JavaScript (ES2023, módulos ESM) sobre Node.js 24 LTS; JSX en el frontend.

**Primary Dependencies**:
- **Backend**: Express 5, Mongoose 8, jsonwebtoken, bcrypt, cookie-parser, helmet, express-rate-limit, zod y dotenv.
- **Frontend**: React 19, React Router 7 (modo *data*), Vite y Tailwind CSS 4 (`@tailwindcss/vite`).

**Storage**: MongoDB 8 como *replica set* (Atlas o un nodo local en Docker), necesario para las transacciones. Colecciones: `users`, `genres`, `books`, `stores`, `store_books`, `reservations`, `favorites` y `audit_logs` ([data-model.md](./data-model.md)).

**Testing**: Vitest en ambos lados.
- **Backend**: Supertest y `mongodb-memory-server` (`MongoMemoryReplSet`).
- **Frontend**: React Testing Library y jsdom.
- **Cobertura**: `@vitest/coverage-v8` con umbral del 70 %.

**Target Platform**: servidor Linux o Windows con Node 24 para la API; navegadores *evergreen* de escritorio y móvil para la SPA (diseño *responsive*, sin app nativa).

**Project Type**: aplicación web (API REST + SPA).

**Performance Goals**:
- Endpoints por debajo de 200 ms en condiciones normales (principio IV).
- El 95 % de las búsquedas y filtrados se perciben en menos de 1 s con 10 000 libros y 500 tiendas (SC-002).

**Constraints**:
- Cero sobrerreservas, incluso con concurrencia (SC-009).
- El 100 % de las operaciones críticas auditadas (SC-005).
- Ningún archivo por encima de 300 líneas.
- Sin SSR, ni Bootstrap, ni estilos en línea, ni Redux.

**Scale/Scope**:
- Datos: 10 000 libros, 500 tiendas, unos miles de usuarios y del orden de 200 usuarios concurrentes.
- Interfaz: 7 historias de usuario, unas 15 pantallas y unos 35 endpoints.

Ninguna incógnita queda abierta: todas se resolvieron en [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. Stack definido | Node 24 LTS, Express 5, React 19 SPA con Vite y React Router 7 en modo *data* (sin modo *framework* ni SSR), Tailwind 4; solo versiones estables (R1). | ✅ |
| II. Seguridad (NON-NEGOTIABLE) | JWT en cookie `httpOnly` + `secure` + `sameSite: 'strict'` (R3). Middlewares `authenticate` y `requireRole('admin')` antes de cada controlador protegido. bcrypt con ≥ 10 rondas (R4). Secretos solo en `.env` con dotenv. `zod` + `sanitizeFilter` + `escapeRegExp`, sin interpolar filtros (R5, R6). | ✅ |
| III. MongoDB + Mongoose | Todo el acceso pasa por modelos de Mongoose con validaciones. Libros y tiendas se relacionan por referencias mediante `store_books`. Sin bases de datos relacionales. | ✅ |
| IV. Rendimiento | Índices en todas las consultas de lectura y filtrado (data-model). Una única conexión en `config/db.js`, abierta al arrancar y cerrada en `SIGINT`/`SIGTERM`. Prueba con `explain()` sin `COLLSCAN` (quickstart). | ✅ |
| V. Código y estructura | Rutas en `camelCase`, componentes en `PascalCase`, campos en `snake_case` y variables de entorno en `SCREAMING_SNAKE_CASE`. Identificadores en inglés y comentarios en español. ESLint + Prettier. Máximo 300 líneas por archivo. Carpetas obligatorias del backend y del frontend presentes (ver estructura). | ✅ |
| VI. Testing ≥ 70 % | Pruebas unitarias de controladores con mocks de Mongoose y de integración de los endpoints principales; umbral de cobertura en la configuración (R13). | ✅ |
| VII. Auditoría | `audit_logs` con `user_id`, `action` y `created_at`, escrito dentro de la transacción de cada operación crítica; también se auditan reservas, inventario y usuarios (R11). | ✅ |
| Licencias (constitución 1.0.1) | Las dependencias directas son MIT o Apache-2.0, salvo `dotenv`, que es la excepción expresa de la constitución. Las transitivas se comprueban contra la lista permisiva con `npm run licenses` (R15). | ✅ |
| Privacidad (GDPR) | Solo se guardan el nombre y el correo, las contraseñas van con hash y la serialización nunca expone `password_hash`. | ✅ |
| Context API / Zustand, no Redux | Solo `AuthContext`; el resto del estado es local en hooks (R14). | ✅ |
| CI | `npm run lint` y `npm test` en la raíz, sin servicios externos (Mongo en memoria). | ✅ |

**Resultado antes de la fase 0**: PASA.

**Resultado después de la fase 1**: PASA. El diseño no añade violaciones. Se corrigieron las rutas `deletion-impact` y `audit-logs` a `deletionImpact` y `auditLogs` para cumplir el principio V.

## Project Structure

### Documentation (this feature)

```text
specs/001-book-catalog-stores/
├── spec.md
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones técnicas R1–R15
├── data-model.md        # Fase 1: colecciones, índices, invariantes y estados
├── quickstart.md        # Fase 1: arranque y escenarios de validación
├── contracts/
│   ├── rest-api.md      # Fase 1: endpoints, cuerpos y errores
│   └── ui-routes.md     # Fase 1: rutas de la SPA
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
bookia/
├── package.json                 # workspaces + scripts lint/test/dev/seed/licenses
├── eslint.config.js             # configuración compartida (flat config)
├── .prettierrc
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js               # crea la app Express (sin listen), para las pruebas
│   │   ├── server.js            # conecta Mongo, arranca el job, listen y cierre controlado
│   │   ├── config/              # env.js (dotenv y validación), db.js (conexión única)
│   │   ├── models/              # User, Genre, Book, Store, StoreBook, Reservation, Favorite, AuditLog
│   │   ├── controllers/         # auth, books, stores, storeBooks, reservations, favorites, users, auditLogs, config
│   │   ├── routes/              # un router por recurso + index.js que monta /api
│   │   ├── middlewares/         # authenticate, requireRole, validate, rateLimit, errorHandler, notFound
│   │   ├── services/            # auditService, reservationService (transiciones), cascadeService
│   │   ├── validators/          # esquemas zod por recurso
│   │   ├── jobs/                # expireReservations.js
│   │   ├── utils/               # normalizeSearch, escapeRegExp, isbn, pagination, httpError
│   │   └── scripts/             # seed.js (géneros, administrador inicial, syncIndexes)
│   └── tests/
│       ├── unit/                # controladores (modelos mockeados), servicios y utils
│       ├── integration/         # Supertest + MongoMemoryReplSet por recurso
│       └── helpers/             # arranque de la base de datos en memoria y fábricas de datos
└── frontend/
    ├── package.json
    ├── vite.config.js           # plugin React + Tailwind, proxy /api y Vitest
    ├── index.html
    ├── src/
    │   ├── main.jsx             # createBrowserRouter + AuthProvider
    │   ├── routes.jsx           # tabla de rutas (contracts/ui-routes.md)
    │   ├── index.css            # @import "tailwindcss"
    │   ├── components/          # Layout, NavBar, BookCard, Pagination, ConfirmDialog, FormField, RequireAuth, RequireAdmin, StatusBadge…
    │   ├── context/             # AuthContext
    │   ├── hooks/               # useAuth, useBooks, useBook, useReservations, useFavorites, useAdminList…
    │   ├── pages/               # una página por ruta, más admin/ para las de administración
    │   ├── services/            # apiClient (fetch con credentials y errores) + un servicio por recurso
    │   └── utils/               # formatPrice, formatDate, reservationStatusLabel
    └── tests/                   # hooks, services, utils y páginas críticas con RTL
```

**Structure Decision**: monorepo de aplicación web con `backend/` y `frontend/` (R2).

- **Carpetas obligatorias**: el backend contiene las cinco que exige la constitución (`config`, `controllers`, `routes`, `middlewares`, `models`) y el frontend, las cuatro suyas (`components`, `hooks`, `pages`, `services`).
- **Carpetas adicionales**: sirven para respetar el límite de 300 líneas sin mezclar responsabilidades.
  - Backend: `services/`, `validators/`, `jobs/`, `utils/` y `scripts/`.
  - Frontend: `context/` y `utils/`.
- **Lógica de negocio**: sigue en los controladores. Solo la lógica transaccional que comparten varios controladores (transiciones de reserva, cascadas y auditoría) vive en `services/`.

## Fases de implementación sugeridas

Es una guía para `/speckit-tasks`, alineada con las prioridades de la spec:

1. **Base**: monorepo, linters, `config/`, conexión, `errorHandler`, `validate`, utils y la configuración de pruebas con `MongoMemoryReplSet`.
2. **Autenticación y roles** (historia 4): `User`, registro, inicio y cierre de sesión, bloqueo, `authenticate` y `requireRole`, *seed* del administrador y los géneros. Es requisito de las historias 2, 3, 5, 6 y 7.
3. **P1: catálogo y gestión** (historias 1, 2 y 3): `Book`, `Store`, `StoreBook`, `auditService`, cascadas sin reservas, catálogo público y páginas de administración.
4. **P2: reservas** (historia 5): `Reservation`, `reservationService`, endpoints, job de caducidad, extensión de las cascadas y pantallas de "Mis reservas" y de administración.
5. **P3: favoritos, usuarios y auditoría** (historias 6 y 7).
6. **Cierre**: prueba de `explain()`, prueba de concurrencia, revisión de la cobertura, `npm run licenses` y repaso de los escenarios del quickstart.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Parte de la lógica de negocio vive en `services/` (transiciones de reserva, cascadas y auditoría) y no en `controllers/` (principio V) | La usan 6 controladores y el job de caducidad, y debe ejecutarse dentro de la misma transacción | Copiarla en cada controlador duplicaría código transaccional crítico y superaría las 300 líneas. Cada controlador sigue siendo responsable de la lógica de su recurso. |
| MongoDB debe ejecutarse como *replica set* (también en local) | Las transacciones son necesarias para cumplir SC-009 (cero sobrerreservas) y SC-005 (auditoría atómica) | Sin transacciones, un fallo entre el contador, la reserva y la auditoría deja datos inconsistentes; las compensaciones manuales son más complejas y frágiles. |
