# Implementation Plan: Mi cuenta

**Branch**: `002-my-account` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-my-account/spec.md`

## Summary

Página «Mi cuenta» para que cada persona con sesión vea sus datos, cambie su nombre y su contraseña, descargue sus datos y borre su cuenta. Así la aplicación cumple los derechos que promete la política de privacidad.

Enfoque técnico:

- **API**: un router `/api/account` que siempre actúa sobre `req.user`, sin ids, con un límite de intentos propio para las operaciones que piden la contraseña.
- **Sesiones**: el cambio de contraseña invalida las demás sesiones con un `session_version` en `User`, que el JWT lleva como `ver`.
- **Borrado**: es una transacción que reutiliza las piezas de la 001. `cancelActiveFor` cancela las reservas activas con el motivo nuevo `account_deleted`, y `assertAnotherActiveAdmin` protege al último administrador. Además, borra los favoritos y anonimiza la auditoría.
- **Interfaz**: una página nueva, `/me/account`, dividida en cuatro componentes, con enlaces desde el menú de usuario, el menú lateral y el pie.

El detalle está en [research.md](./research.md).

## Technical Context

**Language/Version**: JavaScript (ES2023, ESM) sobre Node.js 24 LTS; JSX en el frontend. Igual que la 001.

**Primary Dependencies**: las de la 001, sin dependencias nuevas.
- **Backend**: Express 5, Mongoose 8, jsonwebtoken, bcrypt, express-rate-limit y zod.
- **Frontend**: React 19, React Router 7 y Tailwind 4.

**Storage**: MongoDB (replica set), con las colecciones de la 001.
- Campo nuevo: `users.session_version`.
- Valor nuevo de `reservations.cancel_reason`: `account_deleted`.

Ver [data-model.md](./data-model.md).

**Testing**: Vitest.
- **Backend**: Supertest y `MongoMemoryReplSet`.
- **Frontend**: React Testing Library.
- **Cobertura**: umbral del 70 %, como en la 001.

**Target Platform**: la de la 001, API en Node 24 y SPA en navegadores *evergreen* de escritorio y móvil.

**Project Type**: aplicación web (API REST + SPA), dentro del monorepo existente.

**Performance Goals**:
- Endpoints por debajo de 200 ms (principio IV). bcrypt (unos 60 ms con 10 rondas) se ejecuta fuera de la transacción.
- La exportación de una cuenta con cientos de reservas se resuelve en dos consultas indexadas.

**Constraints**:
- El borrado es todo o nada (FR-020) y nunca deja Bookia sin administradores (SC-005).
- Ningún nombre ni correo sobrevive al borrado (SC-003).
- Ningún archivo pasa de 300 líneas.
- Sin dependencias nuevas.

**Scale/Scope**: 4 historias, 5 endpoints, 1 página con 4 componentes y cambios menores en 6 archivos de la 001: `authenticate`, `sessionCookie`, `auditLogsController`, `NavBar`, `UserMenu` y `PrivacyPage`.

No queda ninguna incógnita abierta: todas se resolvieron en [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. Stack definido | Mismo stack de la 001 y ninguna dependencia nueva. | ✅ |
| II. Seguridad (NON-NEGOTIABLE) | Rutas con `authenticate` y `requireRole('user', 'admin')`. Ninguna recibe un id, así que solo pueden actuar sobre la cuenta de la sesión (R1). La contraseña nueva se cifra con bcrypt con las rondas de `ENV`. Las demás sesiones se invalidan al cambiarla (R2). Límite de intentos por IP en las operaciones con contraseña (R3). Validación con `zod` `.strict()`. | ✅ |
| III. MongoDB + Mongoose | Campo nuevo validado en el esquema de `User` y operaciones mediante modelos. El `updateMany` de tipo *pipeline* de la auditoría también pasa por Mongoose. | ✅ |
| IV. Rendimiento | Las consultas por cuenta usan los índices de la 001 (data-model § Índices). bcrypt va fuera de la transacción. | ✅ |
| V. Código y estructura | Ruta `/account` en `camelCase` y campos en `snake_case`. Identificadores en inglés y comentarios en español. Página dividida en componentes para no pasar de 300 líneas. | ✅ |
| VI. Testing ≥ 70 % | Integración de los 5 endpoints, incluidas la cascada, la anonimización y la concurrencia entre administradores. Pruebas unitarias de `accountController` con mocks, de la versión de sesión y de la página (R9). | ✅ |
| VII. Auditoría | Se auditan el cambio de nombre, el de contraseña (sin el valor) y el borrado, en la misma transacción. Las entradas de una cuenta borrada se conservan sin datos personales (R5). | ✅ |
| Licencias | Sin dependencias nuevas. | ✅ |
| Privacidad (GDPR) | Es el objetivo de la feature: acceso, rectificación, supresión y portabilidad. La exportación nunca incluye `password_hash` ni campos de seguridad, y la política se actualiza. | ✅ |
| Context API, no Redux | Se reutiliza `setUser` de `AuthContext`, y el estado de la página es local. | ✅ |
| CI | Las pruebas nuevas usan Mongo en memoria, como las de la 001. | ✅ |

**Resultado antes de la fase 0**: PASA.

**Resultado después de la fase 1**: PASA. El diseño solo añade un campo y un valor de enum. La lógica que comparten el borrado de la cuenta y la gestión de usuarios, `assertAnotherActiveAdmin`, se mueve a `services/adminGuard.js` en lugar de duplicarse.

## Project Structure

### Documentation (this feature)

```text
specs/002-my-account/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── rest-api.md      # /api/account y cambios en endpoints de la 001
│   └── ui-routes.md     # /me/account y navegación
├── checklists/
│   └── requirements.md  # Calidad de la spec
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Solo se listan los archivos nuevos (+) y los que cambian (~).

```text
backend/
├── src/
│   ├── models/
│   │   ├── User.js                  ~ session_version
│   │   └── Reservation.js           ~ CANCEL_REASONS + account_deleted
│   ├── controllers/
│   │   ├── accountController.js     + getAccount, updateAccount, changePassword, exportAccount, deleteAccount
│   │   ├── usersController.js       ~ importa assertAnotherActiveAdmin de services/adminGuard.js
│   │   └── auditLogsController.js   ~ busca los autores sin populate y marca user_deleted (R5)
│   ├── routes/
│   │   ├── accountRoutes.js         + router /account con su createAuthRateLimit
│   │   └── index.js                 ~ monta /account
│   ├── middlewares/
│   │   └── authenticate.js          ~ compara ver con session_version
│   ├── services/
│   │   ├── accountService.js        + deleteAccountCascade, buildAccountExport
│   │   └── adminGuard.js            + assertAnotherActiveAdmin (movida desde usersController)
│   ├── validators/
│   │   └── accountValidators.js     + updateAccountSchema, changePasswordSchema, deleteAccountSchema
│   └── utils/
│       ├── sessionCookie.js         ~ setSessionCookie(res, user) con ver; readSession → {userId, version}
│       └── presenters.js            ~ toAccount, toAuditLog con user_deleted
└── tests/
    ├── integration/
    │   ├── account.test.js          +
    │   ├── account.delete.test.js   +
    │   └── authorization.test.js    ~ rutas /account*
    └── unit/
        ├── controllers/accountController.test.js  +
        └── utils/sessionCookie.test.js            +

frontend/
├── src/
│   ├── pages/
│   │   ├── MyAccountPage.jsx        + compone las cuatro secciones
│   │   └── PrivacyPage.jsx          ~ derechos desde Mi cuenta (§ 6 y § 7)
│   ├── components/
│   │   ├── AccountProfileForm.jsx   +
│   │   ├── ChangePasswordForm.jsx   +
│   │   ├── AccountDataDownload.jsx  +
│   │   ├── DeleteAccountSection.jsx +
│   │   ├── Layout.jsx               ~ aviso de location.state.notice
│   │   ├── NavBar.jsx, UserMenu.jsx, SiteFooter.jsx  ~ enlace «Mi cuenta»
│   │   └── (AuditLogPage, AdminReservationsPage) ~ «Cuenta eliminada»
│   ├── services/accountService.js   + getAccount, updateAccount, changePassword, deleteAccount, EXPORT_URL
│   ├── context/AuthContext.jsx      ~ clearSession() tras borrar la cuenta
│   ├── utils/reservationStatusLabel.js ~ account_deleted
│   └── routes.jsx                   ~ /me/account
└── tests/
    ├── pages/MyAccountPage.test.jsx +
    └── components/ (formularios)    +
```

**Structure Decision**: la del monorepo de la 001, sin carpetas nuevas. `services/` del backend gana dos módulos. Al igual que en la 001, solo contiene la lógica transaccional compartida (el borrado en cascada y la guarda del último administrador); el resto va en el controlador.

## Fases de implementación sugeridas

Es una guía para `/speckit-tasks`, alineada con las prioridades de la spec:

1. **Base**:
   - `session_version` en `User`, junto con `sessionCookie` y `authenticate` con versión;
   - `account_deleted` en `CANCEL_REASONS`;
   - `adminGuard.js`;
   - router `/account` con `GET`.
2. **P1: datos y nombre** (historia 1): `PATCH /account` auditado, `MyAccountPage` con `AccountProfileForm` y los enlaces de navegación.
3. **P1: contraseña** (historia 2): `POST /account/password` con la invalidación de sesiones y `ChangePasswordForm`.
4. **P2: borrado** (historia 3):
   - `deleteAccountCascade`, la anonimización y `DELETE /account`;
   - `user_deleted` en la auditoría y «Cuenta eliminada» en las reservas;
   - `DeleteAccountSection` y el aviso en `Layout`.
5. **P3: exportación** (historia 4): `GET /account/export` y `AccountDataDownload`.
6. **Cierre**: actualizar la política de privacidad, ampliar la prueba de autorización, revisar la cobertura, `npm run lint` y el recorrido del quickstart.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
