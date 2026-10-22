# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

- Responde en español. Documentos, comentarios, mensajes de commit y todo texto visible para el usuario en español.
- Identificadores, nombres de comandos, flags y valores técnicos en inglés.

## Estado del proyecto

- Existen la constitución y la feature `001-book-catalog-stores` (spec, plan y tareas). Todavía no hay repositorio git.
- Backend implementado parcialmente: base (config, conexión, errores, validación), sesión y roles, auditoría, catálogo (US1) y CRUD de libros, tiendas e inventario (US2, US3), registro y bloqueo de cuentas (US4), reservas (US5) y favoritos (US6). Faltan US7 y el frontend. Detalle en `README.md`.
- Este directorio (`bookia/`) es la raíz del proyecto Spec Kit: ejecuta aquí los scripts y crea aquí el código. Desde el directorio padre, `Get-RepoRoot` resuelve una ruta equivocada.

## Fuentes de verdad (por orden de prioridad)

1. `.specify/memory/constitution.md`: prevalece sobre cualquier otra guía. Se deriva de `../reglas.md`. Versión 1.0.1.
2. `specs/NNN-nombre/spec.md` de cada feature (se deriva de `../spec-input.md`) y sus contratos en `contracts/`.
3. `plan.md`, `data-model.md` y `research.md` de la feature, con las decisiones técnicas concretas.

Lee estos archivos en lugar de fiarte de resúmenes, incluido este.

## Flujo Spec Kit

- Integración `claude` con scripts PowerShell (`.specify/scripts/powershell/*.ps1`). Las skills están en `.claude/skills/speckit-*`; las plantillas, en `.specify/templates/`.
- Ciclo: `speckit-constitution` → `speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-implement`, con revisión tras la spec y tras el plan. Hay skills auxiliares (`speckit-clarify`, `speckit-analyze`, `speckit-checklist`, `speckit-converge`).
- Las features nuevas se numeran de forma secuencial (`specs/NNN-nombre/`).
- `.specify/feature.json` es estado local que gestiona Spec Kit; no lo edites a mano.

## Comandos y arquitectura

Definidos en `specs/001-book-catalog-stores/plan.md`. Hoy existen `dev`, `start`, `lint`, `test`, `seed`, `seed:demo`, `db:check` y `licenses` (sin frontend todavía).

- Monorepo con workspaces de npm: `backend/` (Express 5 + Mongoose 8, ESM) y `frontend/` (React 19 + Vite + React Router 7 en modo *data* + Tailwind 4).
- Comandos desde `bookia/`: `npm install`, `npm run seed`, `npm run dev`, `npm run lint`, `npm test`, `npm run licenses`.
- MongoDB tiene que ser un *replica set* (las reservas y la auditoría usan transacciones); las pruebas usan `MongoMemoryReplSet`.
- La API usa campos JSON en `snake_case` y rutas en `camelCase`. El contrato está en `specs/001-book-catalog-stores/contracts/`.
