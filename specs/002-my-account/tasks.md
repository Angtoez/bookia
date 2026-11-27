---

description: "Lista de tareas de la feature 002-my-account"
---

# Tasks: Mi cuenta

**Input**: documentos de diseño de `specs/002-my-account/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rest-api.md](./contracts/rest-api.md), [contracts/ui-routes.md](./contracts/ui-routes.md) y [quickstart.md](./quickstart.md)

**Tests**: son obligatorios (constitución, principio VI): pruebas unitarias de controladores con mocks, integración de los endpoints y cobertura de al menos el 70 %. En cada historia, las pruebas se escriben primero y deben fallar antes de implementar.

**Organization**: tareas agrupadas por historia (US1 a US4, como en spec.md), para implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario de la tarea.

## Convenciones para todas las tareas

Son las de la [feature 001](../001-book-catalog-stores/tasks.md#convenciones-para-todas-las-tareas), y además:

- **Rutas**: relativas a `bookia/`.
- **Tamaño de archivo**: nunca más de 300 líneas.
- **Errores**: con `HttpError`.
- **Escrituras con varios documentos**: con `runInTransaction` y la auditoría dentro de la misma transacción.
- **Estilos**: solo clases de Tailwind.
- **Rutas de `/account`**: llevan `authenticate`, `requireRole('user', 'admin')`, el límite de intentos si piden la contraseña, `validate(schema)` y el controlador, en ese orden. Ninguna recibe un id: siempre actúan sobre `req.user` (FR-003).
- **Contraseñas**: nunca se escriben en una respuesta, en la auditoría ni en la exportación, ni en claro ni como `password_hash`.

---

## Phase 1: Setup

**Purpose**: no hay infraestructura nueva. El monorepo, las herramientas y la base de pruebas son los de la 001.

- [X] T001 Comprueba que en `main` pasan `npm run lint` y `npm test`, para partir de una base verde.

---

## Phase 2: Foundational (prerrequisitos de todas las historias)

**Purpose**: versión de sesión, motivo de cancelación nuevo, guarda del último administrador y router `/account`.

**⚠️ CRITICAL**: ninguna historia puede empezar antes de terminar esta fase.

### Pruebas de la fase 2

- [X] T002 [P] Escribe `backend/tests/unit/utils/sessionCookie.test.js`:
  - `setSessionCookie(res, user)` firma `{sub, ver}` con `ver = user.session_version`.
  - `readSession(token)` devuelve `{userId, version}`.
  - Un token sin `ver` se lee como `version: 0`.
  - Un token manipulado o caducado devuelve `null`.
- [X] T003 [P] Añade a `backend/tests/integration/auth.session.test.js` un caso: con un usuario de `session_version: 1`, un token con `ver: 0` recibe `401` en `GET /api/auth/me` y la respuesta borra la cookie. Si el token lleva `ver: 1`, recibe `200`.

### Implementación de la fase 2

- [X] T004 [P] Añade a `backend/src/models/User.js` el campo `session_version: { type: Number, default: 0, min: 0 }`. Inclúyelo en la lista de campos que oculta `toJSONOptions`, junto con `password_hash`, `failed_login_count` y `locked_until`.
- [X] T005 [P] Añade `'account_deleted'` a `CANCEL_REASONS` en `backend/src/models/Reservation.js`.
- [X] T006 Cambia `backend/src/utils/sessionCookie.js`:
  - `setSessionCookie(res, user)` recibe el documento y firma `{ sub: String(user._id), ver: user.session_version ?? 0 }`.
  - `readSessionUserId` se sustituye por `readSession(token)`, que devuelve `{userId, version}` (con `version = payload.ver ?? 0`) o `null`.
  - Actualiza las dos llamadas de `backend/src/controllers/authController.js` (`register` y `login`) para pasar `user`.
- [X] T007 Cambia `loadSessionUser` en `backend/src/middlewares/authenticate.js`: usa `readSession` y devuelve `null` si `user.session_version !== version`. Afecta también a `optionalAuthenticate`. Depende de T004 y T006.
- [X] T008 [P] Actualiza `sessionCookieFor(user)` en `backend/tests/helpers/factories.js` para que firme `ver: user.session_version ?? 0`.
- [X] T009 Mueve `assertAnotherActiveAdmin(userId, session)` de `backend/src/controllers/usersController.js` a `backend/src/services/adminGuard.js`, sin cambiar su lógica (`updateMany` sobre los demás administradores activos y `409 LAST_ADMIN` si no hay ninguno). Añade un segundo parámetro opcional, `message`, para el mensaje del error: por defecto, «Debe quedar al menos un administrador activo». `usersController.js` pasa a importarla. Las pruebas de `users.test.js` deben seguir pasando.
- [X] T010 Crea `backend/src/validators/accountValidators.js`, con todos los esquemas `.strict()`:
  - `updateAccountSchema`: `{name}`, recortado, de 1 a 100 caracteres, con los mismos mensajes que `registerSchema`.
  - `changePasswordSchema`: `{current_password, new_password}`. `current_password` es una cadena no vacía de hasta 200 caracteres. `new_password` sigue la política de `registerSchema`. Extrae su esquema de contraseña a un `passwordSchema` exportado en `backend/src/validators/authValidators.js` y reutilízalo aquí (al menos 8 caracteres, `/[A-Za-z]/` y `/[0-9]/`, como mucho 200, con el mensaje «La contraseña debe tener al menos 8 caracteres, con letras y números»).
  - `deleteAccountSchema`: `{password}`, una cadena no vacía de hasta 200 caracteres.
- [X] T011 Crea `backend/src/routes/accountRoutes.js` con `createAccountRouter()`:
  - `GET /` con `authenticate`, `requireRole('user', 'admin')` y `getAccount`.
  - Una instancia de `createAuthRateLimit()` para las rutas de contraseña, que se añaden en US2 y US3.
  - Móntalo en `backend/src/routes/index.js` como `/account`.
- [X] T012 Crea `backend/src/controllers/accountController.js` con `getAccount(req, res)`, que responde `toAccount(req.user)`. Añade `toAccount(user)` a `backend/src/utils/presenters.js`: `{id, name, email, role, created_at}`.
- [X] T013 [P] Crea `frontend/src/services/accountService.js`, con `getAccount()` y la constante `ACCOUNT_EXPORT_URL = '/api/account/export'`. Las demás funciones se añaden en cada historia.

**Checkpoint**: las sesiones tienen versión, existe `GET /api/account` y las pruebas de la 001 siguen pasando.

---

## Phase 3: User Story 1 - Ver los datos de mi cuenta y cambiar mi nombre (Priority: P1) 🎯 MVP

**Goal**: la página «Mi cuenta» muestra los datos, permite cambiar el nombre y está enlazada desde la navegación.

**Independent Test**: iniciar sesión, abrir «Mi cuenta», ver los cuatro datos y cambiar el nombre. El nombre nuevo debe verse en la cabecera y, después, en la auditoría.

### Pruebas de la historia 1

- [X] T014 [P] [US1] Escribe `backend/tests/integration/account.test.js` (bloque «perfil»):
  - `GET /api/account` devuelve `{id, name, email, role, created_at}`, sin `password_hash` ni `session_version`.
  - Sin sesión responde `401`.
  - `PATCH /api/account {name: '  Ana  '}` guarda «Ana» y crea una entrada de auditoría `update`, de `entity_type: 'user'`, con `before: {name}` y `after: {name}`, cuyo autor es el propio usuario.
  - Un nombre vacío o de 101 caracteres da `400 VALIDATION_ERROR`.
  - Un campo extra (`{name, role: 'admin'}`) da `400` y el rol no cambia.
  - El mismo nombre de antes responde `200` sin crear ninguna entrada de auditoría.
- [X] T015 [P] [US1] Escribe `backend/tests/unit/controllers/accountController.test.js` (bloque «perfil»), con `User` y `auditService` mockeados: `getAccount` presenta la cuenta, y `updateAccount` llama a `record` solo si el nombre cambia.
- [X] T016 [P] [US1] Escribe `frontend/tests/pages/MyAccountPage.test.jsx` (bloque «perfil»), con `accountService` y `useAuth` mockeados:
  - Muestra el nombre, el correo, el rol («Usuario» o «Administrador») y la fecha de alta.
  - Al guardar un nombre nuevo, llama a `updateAccount` y a `setUser` y muestra «Nombre guardado».
  - Un error `400` sale junto al campo, desde `details`.

### Implementación de la historia 1

- [X] T017 [US1] Añade `updateAccount` a `backend/src/controllers/accountController.js`:
  - Si el nombre no cambia, responde `toAccount` sin escribir nada.
  - Si cambia, dentro de `runInTransaction`, guarda el nombre y llama a `record({userId: user._id, action: 'update', entityType: 'user', entityId: user._id, entityLabel: newName, before: {name: old}, after: {name: newName}}, session)`.
  - Añade a `accountRoutes.js` la ruta `PATCH /`, con `validate({ body: updateAccountSchema })`.
- [X] T018 [P] [US1] Añade `updateAccount({name})` a `frontend/src/services/accountService.js`.
- [X] T019 [P] [US1] Crea `frontend/src/components/AccountProfileForm.jsx`:
  - Correo, rol y fecha de alta de solo lectura (fecha con `utils/formatDate.js`), y un `FormField` «Nombre» con `maxLength={100}`.
  - Valida en el cliente que no esté vacío.
  - Al guardar, llama a `updateAccount` y a `setUser({...user, name})` de `useAuth`.
  - Muestra «Nombre guardado» en una región `role="status"` y los errores por campo desde `details`.
- [X] T020 [US1] Crea `frontend/src/pages/MyAccountPage.jsx`:
  - `h1` «Mi cuenta» y `document.title` «Mi cuenta · Bookia».
  - Carga `getAccount` con `useApiQuery`, con esqueleto mientras carga y `ErrorMessage` si falla.
  - Una tarjeta por sección (de momento solo `AccountProfileForm`), con el mismo estilo de tarjetas que `PrivacyPage`.
  - Registra `/me/account` como hija de `me` (bajo `RequireAuth`) en `frontend/src/routes.jsx`.
- [X] T021 [US1] Añade el enlace «Mi cuenta» (`/me/account`) en estos tres sitios:
  - En `frontend/src/components/UserMenu.jsx`, como primer enlace para los dos roles: para el admin, en una sección «Mi cuenta» antes de «Administración».
  - En el menú lateral de `frontend/src/components/NavBar.jsx`: la sección «Mi cuenta» vuelve a mostrarse al admin, solo con «Mi cuenta»; el usuario ve además «Mis reservas» y «Mis favoritos».
  - En la columna de la cuenta de `frontend/src/components/SiteFooter.jsx`.

  Actualiza las pruebas afectadas: `tests/components/UserMenu.test.jsx`, `NavBar.test.jsx` y `HomeExtras.test.jsx`.

**Checkpoint**: escenario 1 del quickstart. US1 se puede entregar sola.

---

## Phase 4: User Story 2 - Cambiar mi contraseña (Priority: P1)

**Goal**: cambiar la contraseña con la actual y la política del registro; las demás sesiones se cierran.

**Independent Test**: cambiar la contraseña. La sesión actual debe seguir abierta, la antigua contraseña y las demás sesiones deben dejar de valer, y la nueva contraseña debe funcionar.

### Pruebas de la historia 2

- [X] T022 [P] [US2] Añade a `backend/tests/integration/account.test.js` el bloque «contraseña»:
  - Con datos correctos responde `204` con una `Set-Cookie` nueva:
    - con esa cookie, `GET /api/account` da `200`;
    - con la cookie anterior (la de otra «sesión»), da `401`;
    - el login con la contraseña antigua da `401` y con la nueva da `200`.
  - Con una `current_password` incorrecta, `400 WRONG_PASSWORD` con `details[0].field === 'current_password'`. `failed_login_count` no cambia.
  - Con una `new_password` sin números, `400 VALIDATION_ERROR` con el mensaje de la política.
  - Con una `new_password` igual a la actual, `400 VALIDATION_ERROR` en `new_password` con «La nueva contraseña debe ser distinta de la actual».
  - Hay una entrada de auditoría `update` con `after: {password: 'changed'}`, y ni esa entrada ni la respuesta contienen el hash.
- [X] T023 [P] [US2] Añade a `accountController.test.js` el bloque «contraseña», con `bcrypt` mockeado: no llama a `save` si `compare` devuelve `false`, y sube `session_version` y llama a `setSessionCookie` si todo es correcto.
- [X] T024 [P] [US2] Escribe `frontend/tests/components/ChangePasswordForm.test.jsx`:
  - Marca los requisitos de `PASSWORD_RULES` mientras se escribe.
  - Muestra «Las contraseñas no coinciden» sin llamar a la API.
  - Un `WRONG_PASSWORD` sale junto a «Contraseña actual».
  - Si va bien, vacía los campos y muestra «Contraseña cambiada».

### Implementación de la historia 2

- [X] T025 [US2] Añade `changePassword` a `accountController.js`:
  1. Carga el usuario con `.select('+password_hash')`.
  2. Si `bcrypt.compare(current_password, hash)` es falso, lanza `HttpError(400, 'WRONG_PASSWORD', 'La contraseña actual no es correcta', [{field: 'current_password', message: 'La contraseña actual no es correcta'}])`.
  3. Si `bcrypt.compare(new_password, hash)` es verdadero, lanza un `400 VALIDATION_ERROR` en `new_password` con «La nueva contraseña debe ser distinta de la actual».
  4. Calcula el hash nuevo con `ENV.BCRYPT_ROUNDS` fuera de la transacción.
  5. En `runInTransaction`, guarda `password_hash`, aplica `session_version += 1` y llama a `record({..., action: 'update', entityType: 'user', entityLabel: user.name, before: null, after: {password: 'changed'}})`.
  6. Llama a `setSessionCookie(res, updatedUser)` y responde `204`.

  Añade la ruta `POST /password` a `accountRoutes.js`, con el límite de intentos y `validate({ body: changePasswordSchema })`.
- [X] T026 [P] [US2] Añade `changePassword({current_password, new_password})` a `frontend/src/services/accountService.js`.
- [X] T027 [US2] Crea `frontend/src/components/ChangePasswordForm.jsx`:
  - Tres `FormField` de tipo `password` («Contraseña actual», «Nueva contraseña» y «Repite la nueva contraseña»), con `autoComplete` `current-password` y `new-password`.
  - La lista de requisitos de `PASSWORD_RULES`, como en `RegisterPage`.
  - Valida en el cliente con `meetsPasswordPolicy` y `PASSWORD_POLICY_MESSAGE`.
  - Muestra los errores por campo desde `details` y «Contraseña cambiada» en `role="status"`.

  Añádelo como segunda sección de `MyAccountPage.jsx`.

**Checkpoint**: escenarios 2 y 3 del quickstart.

---

## Phase 5: User Story 3 - Borrar mi cuenta (Priority: P2)

**Goal**: borrado definitivo con contraseña, que cancela las reservas activas, borra los favoritos, anonimiza la auditoría y protege al último administrador.

**Independent Test**: borrar una cuenta con una reserva activa y un favorito. La unidad debe quedar libre, no debe poder iniciarse sesión y la auditoría y las reservas deben mostrar «Cuenta eliminada».

### Pruebas de la historia 3

- [ ] T028 [P] [US3] Escribe `backend/tests/integration/account.delete.test.js`:
  - **Cascada**: un usuario con una reserva `pending`, otra `ready`, otra `picked_up` y un favorito. `DELETE /api/account {password}` responde `204` y borra la cookie, y después:
    - las dos activas quedan `cancelled` con `cancel_reason: 'account_deleted'`, el `reserved_count` de su `StoreBook` baja y la `picked_up` se conserva;
    - `Favorite.countDocuments({user_id}) === 0`;
    - `User.findById` es `null`;
    - el login con esas credenciales da `401 INVALID_CREDENTIALS`;
    - un registro con el mismo correo da `201`.
  - **Sin rastro (SC-003)**: tras borrar una cuenta que cambió su nombre (US1) y fue promovida y degradada por un admin, una búsqueda del nombre antiguo, del nuevo y del correo con `JSON.stringify` sobre todos los documentos de `users`, `reservations`, `favorites` y `audit_logs` no encuentra nada.
  - **Auditoría (respuesta)**: `GET /api/auditLogs` como admin devuelve las entradas de la cuenta con `entity_label: 'Cuenta eliminada'`, y las que hizo ella con `user: null` y `user_deleted: true`. Las del sistema (job de caducidad) siguen con `user: null` y `user_deleted: false`.
  - **Reservas (respuesta)**: `GET /api/reservations` como admin devuelve `user: null` en las reservas de la cuenta.
  - **Contraseña incorrecta**: `400 WRONG_PASSWORD`; la cuenta y sus reservas siguen igual.
  - **Último administrador**: con un solo admin activo, `409 LAST_ADMIN` con «No puedes borrar tu cuenta: eres el último administrador activo».
  - **Concurrencia**: dos admins activos lanzan su `DELETE` a la vez con `Promise.all`. Exactamente uno recibe `204`, el otro `409`, y queda 1 admin activo (SC-005).
- [ ] T029 [P] [US3] Añade a `accountController.test.js` el bloque «borrado», con `accountService` mockeado: no llama a `deleteAccountCascade` si la contraseña falla, y llama a `clearSessionCookie` y responde `204` si va bien.
- [ ] T030 [P] [US3] Escribe `frontend/tests/components/DeleteAccountSection.test.jsx`:
  - El botón abre el diálogo con las consecuencias y el campo de contraseña.
  - Cancelar no llama a la API.
  - Un `WRONG_PASSWORD` sale junto al campo y un `LAST_ADMIN` como mensaje del diálogo.
  - Si va bien, llama a `clearSession` y navega a `/` con `state.notice`.

### Implementación de la historia 3

- [ ] T031 [US3] Crea `backend/src/services/accountService.js` con `deleteAccountCascade(user, session)`. En orden:
  1. Si `user.role === 'admin' && user.status === 'active'`, llama a `assertAnotherActiveAdmin(user._id, session, 'No puedes borrar tu cuenta: eres el último administrador activo')`.
  2. `cancelActiveFor({ user_id: user._id }, 'account_deleted', user._id, session)`.
  3. `Favorite.deleteMany({ user_id: user._id }).session(session)`.
  4. `AuditLog.updateMany({ entity_type: 'user', entity_id: user._id }, [{ $set: { entity_label: 'Cuenta eliminada' } }, { $unset: ['before.name', 'before.email', 'after.name', 'after.email'] }], { session })`.
  5. `record({ userId: user._id, action: 'delete', entityType: 'user', entityId: user._id, entityLabel: 'Cuenta eliminada', before: { role: user.role, created_at: user.created_at } }, session)`.
  6. `User.deleteOne({ _id: user._id }).session(session)`.
- [ ] T032 [US3] Añade `deleteAccount` a `accountController.js`:
  - Compara la contraseña con `bcrypt` fuera de la transacción; si falla, lanza el mismo `400 WRONG_PASSWORD`, con `details` en `password`.
  - Ejecuta `runInTransaction((s) => deleteAccountCascade(user, s))`.
  - Llama a `clearSessionCookie(res)` y responde `204`.

  Añade la ruta `DELETE /` a `accountRoutes.js`, con el límite de intentos y `validate({ body: deleteAccountSchema })`.
- [ ] T033 [US3] Cambia `listAuditLogs` en `backend/src/controllers/auditLogsController.js`:
  - Pagina sin `populate`.
  - Reúne los `user_id` distintos de la página y los busca con una sola `User.find({_id: {$in: ids}}, 'name')`.
  - `toAuditLog(log, usersById)` en `presenters.js` devuelve:
    - `user: {id, name}` si existe;
    - `user: null` con `user_deleted: true` si `user_id` no es nulo pero la cuenta no existe;
    - `user: null` con `user_deleted: false` si `user_id` es nulo.

  Las pruebas de `auditLogs.test.js` deben seguir pasando.
- [ ] T034 [P] [US3] Añade `deleteAccount({password})` a `frontend/src/services/accountService.js`. Añade `clearSession()` a `frontend/src/context/AuthContext.jsx`: vacía `user` sin llamar a la API y sin el evento de `401`. Exponlo en el valor del contexto.
- [ ] T035 [US3] Crea `frontend/src/components/DeleteAccountSection.jsx`:
  - Una tarjeta con borde rojo, título «Borrar la cuenta» y la lista de consecuencias: «Se cancelarán tus reservas activas», «Se borrarán tus favoritos», «No se puede deshacer».
  - El botón «Borrar mi cuenta» abre un `ConfirmDialog` con un `FormField` de contraseña.
  - Al confirmar, llama a `deleteAccount`, después a `clearSession()` y luego a `navigate('/', { state: { notice: 'Tu cuenta se ha borrado' } })`.
  - Los errores se muestran dentro del diálogo.

  El campo va como `children` de `ConfirmDialog`, que ya lo admite. Añade la sección como última de `MyAccountPage.jsx`.
- [ ] T036 [US3] En `frontend/src/components/Layout.jsx`, si `location.state?.notice` existe, muestra un aviso en `role="status"` encima del contenido, con un botón de cerrar. El aviso se limpia al navegar (`navigate(location.pathname, { replace: true, state: null })`).
- [ ] T037 [P] [US3] Muestra «Cuenta eliminada» en las pantallas de administración:
  - En `frontend/src/pages/admin/AuditLogPage.jsx`, cuando `user_deleted` es verdadero, en lugar de «Sistema».
  - En `frontend/src/pages/admin/AdminReservationsPage.jsx`, cuando `reservation.user` es `null`, incluido el `aria-label` de las acciones.
  - En `frontend/src/utils/reservationStatusLabel.js`, añade `account_deleted: { owner: 'cuenta eliminada', admin: 'cuenta eliminada' }`.

  Añade un caso a sus pruebas.

**Checkpoint**: escenarios 5 y 6 del quickstart.

---

## Phase 6: User Story 4 - Descargar mis datos (Priority: P3)

**Goal**: descargar en JSON la cuenta, las reservas y los favoritos, sin datos de seguridad.

**Independent Test**: descargar el archivo con una cuenta que tenga reservas y favoritos y revisar su contenido.

### Pruebas de la historia 4

- [ ] T038 [P] [US4] Añade a `backend/tests/integration/account.test.js` el bloque «exportación»:
  - `GET /api/account/export` responde `200` con `content-disposition` `attachment; filename="bookia-mis-datos-AAAA-MM-DD.json"` (fecha de hoy).
  - El cuerpo tiene `exported_at`, `account` (`{name, email, role, created_at}`), las 2 reservas del usuario (con `book_title`, `book_isbn`, `store_name`, `store_address`, `price_cents`, `status` y fechas), en orden de creación descendente, y su favorito (`{title, author, isbn, added_at}`).
  - No contiene reservas ni favoritos de otro usuario.
  - `JSON.stringify(body)` no contiene `password_hash`, `failed_login_count`, `locked_until`, `session_version` ni `_id`.
  - Una cuenta sin reservas ni favoritos recibe listas vacías.
- [ ] T039 [P] [US4] Añade a `accountController.test.js` el bloque «exportación», con `buildAccountExport` mockeado: comprueba la cabecera y el nombre del archivo.

### Implementación de la historia 4

- [ ] T040 [US4] Añade `buildAccountExport(user)` a `backend/src/services/accountService.js`:
  - Hace `Reservation.find({user_id}).sort({created_at: -1}).populate('book_id', 'isbn').lean()`.
  - Hace `Favorite.find({user_id}).populate('book_id', 'title author isbn').lean()`.
  - Construye campo a campo el documento de [data-model § Exportación](./data-model.md#exportación-no-se-guarda), sin copiar objetos enteros.
  - `book_isbn` es `null` si el libro se borró, y los favoritos de libros borrados se omiten.

  Añade `exportAccount` a `accountController.js`: pone la cabecera `Content-Disposition` y responde `json`. Añade la ruta `GET /export` a `accountRoutes.js`.
- [ ] T041 [US4] Crea `frontend/src/components/AccountDataDownload.jsx`:
  - Una explicación breve de qué incluye el archivo.
  - Un enlace con aspecto de botón a `ACCOUNT_EXPORT_URL` con el atributo `download` y el texto «Descargar mis datos».
  - Un enlace a `/privacidad`.

  Añádelo como tercera sección de `MyAccountPage.jsx`. Añade un caso a `MyAccountPage.test.jsx` que compruebe el `href` y `download`.

**Checkpoint**: escenario 4 del quickstart.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T042 [P] Amplía `backend/tests/integration/authorization.test.js`: añade `GET /api/account`, `PATCH /api/account`, `POST /api/account/password`, `GET /api/account/export` y `DELETE /api/account` a la tabla, con `401` para el anónimo y `200`, `204` o `400` (no `403`) para `user` y `admin`. La comprobación de la pila (`authenticate` implica `requireRole`) debe cubrir el router nuevo.
- [ ] T043 [P] Actualiza `frontend/src/pages/PrivacyPage.jsx`:
  - § 6, Conservación: al borrar la cuenta desde «Mi cuenta», los datos personales se eliminan al momento; las reservas cerradas se conservan sin datos que te identifiquen y la auditoría, sin tu nombre ni tu correo.
  - § 7, Derechos: indica que se pueden ejercer desde «Mi cuenta» (enlace a `/me/account`), además de por correo.

  Cambia `PRIVACY_UPDATED` a la fecha del cambio y actualiza su prueba.
- [ ] T044 Actualiza `CLAUDE.md` (estado del proyecto y frontend: `/me/account`, `session_version` en el JWT y la regla de no exponerlo) y `README.md` (sección de funcionalidades).
- [ ] T045 Ejecuta `npm run lint` y `npm test`. Corrige los avisos, comprueba que ningún archivo pasa de 300 líneas y que la cobertura sigue por encima del 70 %.
- [ ] T046 Recorre los 6 pasos del [quickstart](./quickstart.md) § Recorrido manual con cuentas de prueba y anota las diferencias en `specs/002-my-account/checklists/validation.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (fase 1)**: no tiene dependencias.
- **Foundational (fase 2)**: depende de la fase 1 y **bloquea todas las historias**. T007 depende de T004 y T006.
- **Historias (fases 3 a 6)**: todas dependen de la fase 2.
- **Polish (fase 7)**: depende de las historias que se quieran entregar.

### User Story Dependencies

| Historia | Depende de | Notas |
|----------|------------|-------|
| US1 (P1) datos y nombre | Fase 2 | Crea `MyAccountPage` y los enlaces. |
| US2 (P1) contraseña | Fase 2 | Usa `session_version`. En el frontend añade una sección a la página de US1; el backend no depende de US1. |
| US3 (P2) borrado | Fase 2 | Usa `adminGuard` y `cancelActiveFor`. Su prueba SC-003 usa el cambio de nombre de US1. |
| US4 (P3) exportación | Fase 2 | Comparte `accountService.js` con US3, con funciones distintas. |

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Después van el validador y el servicio, el controlador y la ruta, el servicio del frontend, el componente y la página.
- Cada historia se cierra con su checkpoint.

### Parallel Opportunities

- **Fase 2**:
  - T002 y T003 (pruebas) en paralelo.
  - T004, T005, T008 y T013 en paralelo.
  - T009 y T010 son independientes de T006 y T007.
- **Cada historia**: las tareas [P] de pruebas en paralelo, y el servicio del frontend en paralelo con el backend.
- **Entre historias**: el backend de US2, US3 y US4 puede avanzar en paralelo tras la fase 2. Coordina `accountController.js` y `accountRoutes.js`: son funciones y rutas distintas en el mismo archivo.

---

## Parallel Example: User Story 3

```text
# Pruebas de US3 en paralelo:
Task: "T028 Integración del borrado en backend/tests/integration/account.delete.test.js"
Task: "T029 Unitarias del borrado en backend/tests/unit/controllers/accountController.test.js"
Task: "T030 DeleteAccountSection en frontend/tests/components/DeleteAccountSection.test.jsx"

# Frontend en paralelo con el backend de US3:
Task: "T034 deleteAccount y clearSession en frontend/src/services/ y frontend/src/context/"
Task: "T037 «Cuenta eliminada» en AuditLogPage, AdminReservationsPage y reservationStatusLabel"
```

---

## Implementation Strategy

### MVP First (solo User Story 1)

1. Fase 1 y fase 2.
2. Fase 3 (US1).
3. **PARAR Y VALIDAR**: escenario 1 del quickstart.

### Incremental Delivery

1. Fases 1 y 2: base lista.
2. US1: ver los datos y cambiar el nombre (MVP).
3. US2: cambiar la contraseña. Junto con US1 cubre la rectificación y la seguridad básica.
4. US3: borrar la cuenta, el derecho de supresión.
5. US4: descargar los datos, los derechos de acceso y portabilidad.
6. Fase 7: autorización, política de privacidad, documentación y validación.

---

## Notes

- **[P]**: archivos distintos y sin dependencias pendientes.
- **[Story]**: enlaza cada tarea con su historia, para poder seguirla.
- Haz un commit al terminar cada fase, con el mensaje en español.
- **US3 es destructiva**: sus pruebas usan siempre la base de datos en memoria y el recorrido manual (T046), cuentas de prueba.
