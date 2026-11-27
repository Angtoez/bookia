# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

- Responde en español. Documentos, comentarios, mensajes de commit y todo texto visible para el usuario en español.
- Identificadores, nombres de comandos, flags y valores técnicos en inglés.

## Estado del proyecto

- Existen la constitución y la feature `001-book-catalog-stores` (spec, plan y tareas). El repositorio git trabaja en la rama `main`.
- Backend implementado: base (config, conexión, errores, validación), sesión y roles, auditoría, catálogo (US1) y CRUD de libros, tiendas e inventario (US2, US3), registro y bloqueo de cuentas (US4), reservas (US5), favoritos (US6) y usuarios y auditoría (US7). Frontend: base de la SPA, login, catálogo (US1), registro (US4), administración de libros, tiendas e inventario (US2, US3), reservas (US5), favoritos (US6) y usuarios y auditoría (US7). De la fase 10 de `tasks.md` (pulido transversal) solo falta la T135, el recorrido manual de `quickstart.md`, que hace el usuario con sus cuentas. Detalle en `README.md`.
- Fuera de `tasks.md`, ya hechos: género Manga y 83 cómics y mangas de demostración, sinopsis de todos los libros de demostración, y un rediseño del frontend (cabecera con búsqueda y menú lateral, portada de estilo editorial y ficha del libro en tres columnas). Ver «Frontend» más abajo.
- Este directorio (`bookia/`) es la raíz del proyecto Spec Kit: ejecuta aquí los scripts y crea aquí el código. Desde el directorio padre, `Get-RepoRoot` resuelve una ruta equivocada.

## Fuentes de verdad (por orden de prioridad)

1. `.specify/memory/constitution.md`: prevalece sobre cualquier otra guía. Se deriva de `../reglas.md`. Versión 1.0.2.
2. `specs/NNN-nombre/spec.md` de cada feature (se deriva de `../spec-input.md`) y sus contratos en `contracts/`.
3. `plan.md`, `data-model.md` y `research.md` de la feature, con las decisiones técnicas concretas.

Lee estos archivos en lugar de fiarte de resúmenes, incluido este.

## Flujo Spec Kit

- Integración `claude` con scripts PowerShell (`.specify/scripts/powershell/*.ps1`). Las skills están en `.claude/skills/speckit-*`; las plantillas, en `.specify/templates/`.
- Ciclo: `speckit-constitution` → `speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-implement`, con revisión tras la spec y tras el plan. Hay skills auxiliares (`speckit-clarify`, `speckit-analyze`, `speckit-checklist`, `speckit-converge`).
- Las features nuevas se numeran de forma secuencial (`specs/NNN-nombre/`).
- `.specify/feature.json` es estado local que gestiona Spec Kit; no lo edites a mano.

## Comandos y arquitectura

Definidos en `specs/001-book-catalog-stores/plan.md`. Hoy existen `dev`, `start`, `build`, `lint`, `format`, `test`, `seed`, `seed:demo`, `db:check` y `licenses`.

- Monorepo con workspaces de npm: `backend/` (Express 5 + Mongoose 8, ESM) y `frontend/` (React 19 + Vite + React Router 7 en modo *data* + Tailwind 4).
- Comandos desde `bookia/`: `npm install`, `npm run seed`, `npm run dev`, `npm run lint`, `npm test`, `npm run licenses`.
- `npm run dev -w backend` usa `node --watch-path=src`: el proyecto está en OneDrive, que toca archivos de `node_modules` al sincronizar, y con `--watch` a secas la API se reiniciaba sola y cortaba peticiones.
- MongoDB tiene que ser un *replica set* (las reservas y la auditoría usan transacciones); las pruebas usan `MongoMemoryReplSet`.
- La API usa campos JSON en `snake_case` y rutas en `camelCase`. El contrato está en `specs/001-book-catalog-stores/contracts/`.
- Frontend:
  - `react-router` se mantiene en la 7.x, como fija el plan, aunque ya exista la 8.
  - No se usa `eslint-plugin-react` porque no admite ESLint 10. La prohibición del atributo `style` se hace con `no-restricted-syntax` en `eslint.config.js`, y las reglas de hooks vienen de `eslint-plugin-react-hooks`.
  - Las lecturas de la API pasan por `hooks/useApiQuery.js`, que deriva `loading` sin actualizar el estado dentro de `useEffect`, como exigen las reglas de `react-hooks` 7.
  - Los importes se escriben en la moneda de `GET /api/config`, que no tiene por qué ser el euro, y se convierten a céntimos con `utils/money.js`, sin coma flotante. `utils/isbn.js` y `utils/passwordPolicy.js` repiten las reglas del backend: si cambian en un lado, hay que cambiarlas en el otro.
  - La marca está en los tokens `primary-*` y `paper` de `index.css`; los componentes no usan nombres de color de Tailwind para la marca. Las portadas salen de Open Library por ISBN (`utils/bookCover.js`), con una genérica por género mientras cargan o si no existen.
  - Cabecera (`Layout.jsx`), fija con `sticky`: botón de menú y logotipo a la izquierda, búsqueda (`NavSearch.jsx`) en el centro y menú de usuario (`UserMenu.jsx`) a la derecha. En escritorio la búsqueda es una barra siempre visible y en móvil una lupa; lo decide `useMediaQuery(DESKTOP_QUERY)`, que sin `matchMedia` (jsdom) se comporta como en móvil. `UserMenu` despliega la cuenta, la administración si es admin y "Cerrar sesión". El panel lateral de `NavBar.jsx` (un `<dialog>` modal como `ConfirmDialog`) sigue con todos los enlaces y los géneros. Como la cabecera tapa lo que queda debajo, los anclajes usan `scroll-mt-20`. El pie es `SiteFooter.jsx`.
  - `CatalogPage` sin filtros y en la página 1 es la portada: `HomeHero` (banner, con el `h1` oculto), `HowItWorks` (plazos de `GET /api/config`; ancla `#como-funciona`), `HomeShelves` (secciones con `BookShelf`) y el listado. Sobre el listado, con o sin filtros, están los chips de `GenreChips.jsx`. Las secciones a todo lo ancho usan `mx-[calc(50%-50vw)]`, por eso el contenedor de `Layout` lleva `overflow-x-clip`.
  - La ficha (`BookDetailPage`) usa `grid-template-areas` para cambiar el orden en móvil, con `BookAvailabilityBox` (disponibilidad y reservas) y `GenreShelf` al pie.
  - Valoraciones provisionales: Bookia aún no tiene reseñas. `services/reviewsService.js` (`listTopRated`, `getBookRating`) lee `services/topRatedSample.js`, con valoraciones reales de Open Library consultadas el 24/10/2026. Cuando exista el endpoint, solo cambia ese servicio. Como la API no busca por ISBN, `listTopRated` busca cada libro por título: si se renombra uno de esos libros, hay que actualizar su título en `topRatedSample.js`.
- Datos de demostración (`backend/src/scripts/`): `demoCatalog.js`, `demoComicsManga.js` (en archivo aparte para no mover los índices del reparto de inventario) y las sinopsis en `demoSynopses.js` y `demoSynopsesComicsManga.js`. `seed:demo` no sobrescribe nada salvo para rellenar la sinopsis de los libros que no la tienen. Los ISBN son de ediciones reales con portada en Open Library.
