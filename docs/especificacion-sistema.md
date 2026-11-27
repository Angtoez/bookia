# Especificación del sistema: Bookia (SDD con Spec Kit)

Bookia es una aplicación web para consultar libros y saber en qué puntos de venta están disponibles, con el precio y las unidades de cada tienda. Los usuarios registrados guardan favoritos y reservan un ejemplar para recogerlo y pagarlo en la tienda. Los administradores gestionan libros, tiendas, inventario, reservas y usuarios, y cada cambio crítico queda auditado.

El proyecto se ha desarrollado con **Spec-Driven Development (SDD)** usando **Spec Kit**: primero se fijan las reglas (constitución), luego qué se construye (spec), después cómo (plan, modelo de datos y contratos) y por último las tareas que se implementan. Este documento reúne los enlaces a todos esos artefactos y resume qué aporta cada uno.

## 1. Índice de artefactos

| Artefacto | Archivo | ¿Se usó? | Qué contiene |
|-----------|---------|----------|--------------|
| **Constitution** | [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) | Sí (v1.0.2) | Las 7 reglas no negociables del proyecto: stack, seguridad, persistencia, rendimiento, estándares de código, testing y auditoría. |
| **Spec** | [`specs/001-book-catalog-stores/spec.md`](../specs/001-book-catalog-stores/spec.md) | Sí | 7 historias de usuario con escenarios de aceptación, requisitos funcionales FR-001 a FR-029, entidades clave y criterios de éxito SC-001 a SC-010. |
| **Plan** | [`specs/001-book-catalog-stores/plan.md`](../specs/001-book-catalog-stores/plan.md) | Sí | Contexto técnico, verificación contra la constitución, estructura del código y fases de implementación. |
| **Data model** | [`specs/001-book-catalog-stores/data-model.md`](../specs/001-book-catalog-stores/data-model.md) | Sí | Las 8 colecciones de MongoDB con campos, reglas, índices, invariantes y estados. |
| **Tasks** | [`specs/001-book-catalog-stores/tasks.md`](../specs/001-book-catalog-stores/tasks.md) | Sí | 135 tareas (T001–T135) en 10 fases, agrupadas por historia de usuario. |
| **PRD** (documento de entrada) | [`../../spec-input.md`](../../spec-input.md) | Sí, como entrada | No hay un PRD formal. Su papel lo cumple `spec-input.md`, la descripción de producto (roles, funciones y lo que queda fuera) que se pasó a `speckit-specify` para generar la spec. |
| **Arquitectura** | [`plan.md` § Technical Context y Project Structure](../specs/001-book-catalog-stores/plan.md#technical-context) y [`research.md`](../specs/001-book-catalog-stores/research.md) | Sí | No hay un documento de arquitectura aparte: la arquitectura está en el plan y las decisiones técnicas razonadas (R1–R15), en `research.md`. |
| **Esquema de base de datos** | [`data-model.md`](../specs/001-book-catalog-stores/data-model.md) y [`backend/src/models/`](../backend/src/models/) | Sí | El diseño está en `data-model.md`; los esquemas de Mongoose que lo implementan, en `backend/src/models/`. |
| **CLAUDE.md** | [`CLAUDE.md`](../CLAUDE.md) | Sí | Guía para Claude Code: idioma, estado del proyecto, fuentes de verdad, flujo Spec Kit, comandos y notas de arquitectura. |

### Artefactos complementarios

| Artefacto | Archivo | Qué contiene |
|-----------|---------|--------------|
| Reglas de origen de la constitución | [`../../reglas.md`](../../reglas.md) | Texto del que se deriva la constitución; las enmiendas se proponen aquí. |
| Decisiones técnicas | [`research.md`](../specs/001-book-catalog-stores/research.md) | R1–R15: versiones, autenticación, búsqueda, importes, reservas sin sobrerreserva, caducidad, cascadas, auditoría, pruebas y licencias. |
| Contrato de la API REST | [`contracts/rest-api.md`](../specs/001-book-catalog-stores/contracts/rest-api.md) | Endpoints, cuerpos, códigos de error y permisos. |
| Contrato de rutas de la SPA | [`contracts/ui-routes.md`](../specs/001-book-catalog-stores/contracts/ui-routes.md) | Rutas del frontend y quién puede verlas. |
| Arranque y validación | [`quickstart.md`](../specs/001-book-catalog-stores/quickstart.md) | Configuración, arranque y los 8 escenarios de validación manual. |
| Checklists | [`checklists/requirements.md`](../specs/001-book-catalog-stores/checklists/requirements.md) y [`checklists/validation.md`](../specs/001-book-catalog-stores/checklists/validation.md) | Calidad de la spec y recorrido manual de la T135. |
| Guía de agentes | [`../../AGENTS.md`](../../AGENTS.md) | Guía operativa inicial; describe el proyecto antes de que existiera el código (está desactualizada). |
| README | [`README.md`](../README.md) | Estado de la implementación, modelo de datos, instalación y pruebas de la API a mano. |
| Plantillas y skills de Spec Kit | [`.specify/templates/`](../.specify/templates/) y [`.claude/skills/`](../.claude/skills/) | Plantillas de spec, plan, tasks y checklist, y las skills `speckit-*`. |

## 2. Flujo SDD seguido

```text
reglas.md ──speckit-constitution──▶ constitution.md
spec-input.md ──speckit-specify──▶ spec.md ──(clarify + revisión)
                                      │
                         speckit-plan ▼
          plan.md + research.md + data-model.md + contracts/ + quickstart.md ──(revisión)
                                      │
                        speckit-tasks ▼
                                  tasks.md
                                      │
                    speckit-implement ▼
                         backend/ + frontend/
```

- La feature es la `001-book-catalog-stores`, en `specs/001-book-catalog-stores/`.
- Hubo una sesión de aclaraciones el 13/10/2026 (recogida en la spec): el usuario registrado puede guardar favoritos y reservar, y la asociación libro–tienda guarda stock y precio propio.
- El plan pasó la verificación de la constitución antes y después del diseño. Las tres excepciones justificadas están en su tabla *Complexity Tracking*.

## 3. Resumen de la constitución

Versión 1.0.2, ratificada el 13/10/2026 y enmendada por última vez el 22/10/2026.

| Principio | Regla principal |
|-----------|-----------------|
| I. Stack definido | Node.js + Express (API REST) y React SPA con Vite, React Router y Tailwind CSS; solo versiones estables. |
| II. Seguridad (NON-NEGOTIABLE) | JWT en cookie `httpOnly`, `secure` y `sameSite: 'strict'`; RBAC con middlewares; bcrypt con ≥ 10 rondas; secretos con `dotenv`; entradas saneadas. |
| III. MongoDB + Mongoose | Modelo de documentos con referencias; todo acceso por Mongoose; nada de SQL. |
| IV. Rendimiento | Endpoints por debajo de 200 ms, índices en las consultas frecuentes y una única conexión a MongoDB. |
| V. Código y estructura | Convenciones de nombres, identificadores en inglés y comentarios en español, ESLint + Prettier, máximo 300 líneas por archivo y carpetas obligatorias. |
| VI. Testing | Cobertura ≥ 70 %, pruebas unitarias de controladores con mocks y pruebas de integración de los endpoints. |
| VII. Auditoría | Las altas, cambios y bajas de libros y establecimientos se registran en `audit_logs`. |

También fija las licencias admitidas (MIT o Apache-2.0 en las directas, salvo `dotenv`) y las decisiones descartadas: sin SSR ni Next.js, sin Bootstrap ni estilos en línea, y sin Redux.

## 4. Resumen de la spec

**Roles**: visitante (sin sesión), usuario registrado y administrador.

| Historia | Prioridad | Descripción |
|----------|-----------|-------------|
| US1 | P1 (MVP) | Consultar el catálogo, buscar por título o autor, filtrar por género y ver en qué tiendas está cada libro. |
| US2 | P1 | El administrador crea, edita y elimina libros. |
| US3 | P1 | El administrador gestiona puntos de venta y su inventario (stock y precio propio). |
| US4 | P2 | Registro, inicio y cierre de sesión, con bloqueo tras 5 intentos fallidos. |
| US5 | P2 | Reservar un ejemplar en una tienda, sin sobrerreservas y con caducidad automática. |
| US6 | P3 | Guardar libros favoritos. |
| US7 | P3 | El administrador gestiona usuarios y consulta la auditoría. |

**Fuera de alcance**: pagos, carrito, envíos, app móvil nativa, recuperación de contraseña por correo y autoservicio de las tiendas.

## 5. Arquitectura (según el plan)

- **Monorepo** con workspaces de npm: `backend/` y `frontend/`.
- **Backend**: Node.js 24 LTS, Express 5, Mongoose 8, jsonwebtoken, bcrypt, helmet, express-rate-limit, zod y dotenv. Carpetas `config/`, `models/`, `controllers/`, `routes/`, `middlewares/`, `services/`, `validators/`, `jobs/`, `utils/` y `scripts/`.
- **Frontend**: React 19, React Router 7 (modo *data*), Vite y Tailwind CSS 4. Carpetas `components/`, `context/`, `hooks/`, `pages/`, `services/` y `utils/`. El estado global se limita a `AuthContext`.
- **Base de datos**: MongoDB 8 como *replica set*, porque las reservas, las cascadas y la auditoría usan transacciones.
- **Pruebas**: Vitest en los dos lados; Supertest y `MongoMemoryReplSet` en el backend, y React Testing Library en el frontend.
- **Decisiones clave** ([research.md](../specs/001-book-catalog-stores/research.md)): contadores `reserved_count` con actualización condicional dentro de transacciones para evitar sobrerreservas, campos de búsqueda normalizados con índice, importes en céntimos enteros y un job en proceso que caduca las reservas vencidas.

## 6. Esquema de base de datos

```text
User 1───* Reservation *───1 StoreBook *───1 Store
  │                              │
  └──1───* Favorite *───1 Book 1─┘──*───1 Genre
AuditLog ··· referencia blanda (entity_type + entity_id) a cualquier entidad
```

| Colección | Modelo | Propósito |
|-----------|--------|-----------|
| `users` | [`User.js`](../backend/src/models/User.js) | Cuentas, rol, estado, bloqueo por intentos fallidos y contador de reservas activas. |
| `genres` | [`Genre.js`](../backend/src/models/Genre.js) | Lista predefinida de géneros. |
| `books` | [`Book.js`](../backend/src/models/Book.js) | Libros con ISBN único y precio de referencia. |
| `stores` | [`Store.js`](../backend/src/models/Store.js) | Puntos de venta. |
| `store_books` | [`StoreBook.js`](../backend/src/models/StoreBook.js) | Relación N:M libro–tienda con stock, precio propio y unidades reservadas. |
| `reservations` | [`Reservation.js`](../backend/src/models/Reservation.js) | Reservas de una unidad, con sus estados (`pending` → `ready` → `picked_up`, o `cancelled` / `expired`). |
| `favorites` | [`Favorite.js`](../backend/src/models/Favorite.js) | Libros favoritos de cada usuario. |
| `audit_logs` | [`AuditLog.js`](../backend/src/models/AuditLog.js) | Registro inmutable de las operaciones críticas. |

Los campos, índices e invariantes de cada colección están en [`data-model.md`](../specs/001-book-catalog-stores/data-model.md).

## 7. Tareas y estado

[`tasks.md`](../specs/001-book-catalog-stores/tasks.md) organiza 135 tareas en 10 fases:

| Fase | Contenido | Tareas |
|------|-----------|--------|
| 1–2 | Setup y base (configuración, conexión, errores, validación, sesión, roles y auditoría) | T001–T038 |
| 3 | US1: catálogo | T039–T053 |
| 4 | US2: gestión de libros | T054–T065 |
| 5 | US3: puntos de venta e inventario | T066–T078 |
| 6 | US4: registro e inicio de sesión | T079–T087 |
| 7 | US5: reservas | T088–T106 |
| 8 | US6: favoritos | T107–T116 |
| 9 | US7: usuarios y auditoría | T117–T127 |
| 10 | Pulido (autorización, rendimiento, lint, cobertura, licencias, accesibilidad, README y validación manual) | T128–T135 |

**Estado**: el backend y el frontend de las 7 historias están implementados, y de la fase 10 solo queda la T135, el recorrido manual de `quickstart.md`, que se anota en [`checklists/validation.md`](../specs/001-book-catalog-stores/checklists/validation.md). Las casillas de `tasks.md` no se fueron marcando durante la implementación; el estado real está en [`CLAUDE.md`](../CLAUDE.md), en el [`README.md`](../README.md) y en el historial de git.

## 8. Uso de CLAUDE.md

[`CLAUDE.md`](../CLAUDE.md) es la guía que lee Claude Code en cada sesión. Establece:

- El idioma: respuestas, documentos y commits en español; identificadores en inglés.
- El orden de las fuentes de verdad: constitución → spec y contratos → plan, modelo de datos y research.
- El ciclo de Spec Kit y dónde ejecutar sus scripts (`bookia/` es la raíz del proyecto).
- Los comandos (`dev`, `test`, `lint`, `seed`, `licenses`…) y notas de arquitectura del frontend y de los datos de demostración.

Hay además un `CLAUDE.md` en la carpeta padre con las instrucciones de idioma, y el [`AGENTS.md`](../../AGENTS.md) inicial.
