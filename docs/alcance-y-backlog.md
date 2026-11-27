# Bookia: planificación del alcance y Product Backlog

Este documento reúne la planificación del alcance de Bookia: el enunciado de alcance (qué entra y qué no), las épicas, las historias de usuario y el Product Backlog priorizado con su plan de entregas.

Todo sale de los documentos del proyecto:

- La descripción de producto (`spec-input.md`).
- La especificación (`specs/001-book-catalog-stores/spec.md`), con sus historias, sus requisitos FR-001 a FR-029 y sus criterios de éxito SC-001 a SC-010.
- El plan, las tareas (`tasks.md`), la constitución y el estado registrado en `README.md` y `CLAUDE.md`.

Las épicas y la división de las 7 historias de la spec en elementos de backlog más pequeños son una forma de organizar esa información: cada elemento indica de qué requisitos sale. El proyecto no usa puntos de historia, así que el esfuerzo se expresa con el número de tareas de `tasks.md`.

## 1. Enunciado de alcance

### 1.1 Objetivo del producto

Bookia es una aplicación web para consultar libros y saber en qué puntos de venta están disponibles, con el precio y las unidades de cada tienda. Resuelve la pregunta «¿dónde consigo este libro?» y permite asegurarse un ejemplar reservándolo para recogerlo y pagarlo en la tienda.

### 1.2 Usuarios (roles)

| Rol | Descripción |
|-----|-------------|
| Visitante | Consulta el catálogo y la disponibilidad sin iniciar sesión. |
| Usuario registrado | Además, guarda favoritos y reserva ejemplares en una tienda. |
| Administrador | Gestiona libros, puntos de venta, inventario, reservas y usuarios, y consulta la auditoría. |

### 1.3 Dentro del alcance

| Área | Qué incluye | Requisitos |
|------|-------------|------------|
| Catálogo público | Listado paginado (20 por página), búsqueda parcial por título o autor sin distinguir mayúsculas ni tildes, filtro por género combinable con la búsqueda, y detalle del libro con cada tienda, su precio y sus unidades (o «agotado»). | FR-009 a FR-012 |
| Gestión de libros | Alta, edición y baja de libros (título, autor, género, ISBN-10/13 único, precio; descripción, editorial y año opcionales). La baja pide confirmación y quita el libro de todas las tiendas. | FR-013 a FR-017 |
| Puntos de venta e inventario | Alta, edición y baja de establecimientos (nombre, dirección, horario y teléfono opcional). Asociación libro–tienda sin duplicados, con stock y precio propio opcional. El stock no puede bajar de las unidades reservadas. | FR-018 a FR-021 |
| Cuentas y acceso | Registro con nombre, correo único y contraseña (≥ 8 caracteres con letras y números), inicio y cierre de sesión, sesión de 24 h, bloqueo de 15 min tras 5 fallos seguidos y tres roles verificados en el servidor. | FR-001 a FR-008 |
| Reservas | Reservar una unidad en una tienda con existencias, como máximo 5 reservas activas por usuario y sin sobrerreservas. Estados pendiente → lista para recoger → recogida, o cancelada / caducada. Caducidad automática (7 días para prepararla y 3 para recogerla) y cancelación en cascada. «Mis reservas» y gestión por el administrador. | FR-022 a FR-022h |
| Favoritos | Marcar y desmarcar favoritos, y «Mis favoritos» con la disponibilidad actual. | FR-022i, FR-022j |
| Administración de usuarios | Listar usuarios, cambiar el rol y desactivar o reactivar cuentas; siempre queda al menos un administrador activo. | FR-023 a FR-025 |
| Auditoría | Registro inmutable de las altas, cambios y bajas de libros, tiendas e inventario, de los cambios de rol y de estado de las cuentas y de los cambios de estado de las reservas. Consulta filtrable por tipo de elemento. | FR-026 a FR-029 |

### 1.4 Fuera del alcance

Según `spec-input.md` y las suposiciones de la spec:

- Pagos y carrito de compras. Una reserva no es una compra: se paga en la tienda al recoger.
- Envíos.
- App móvil nativa (la web es *responsive* para escritorio y móvil).
- Recuperación de contraseña por correo y verificación del correo.
- Inicio de sesión con redes sociales.
- Notificaciones por correo o *push*: los cambios de estado de las reservas solo se ven en «Mis reservas».
- Autoservicio de los establecimientos: las tiendas no acceden a Bookia; los administradores actualizan sus datos y sus reservas.
- Editar la lista de géneros desde la aplicación (se carga al instalar).
- Portadas de libros: la spec las deja fuera del alcance. Más tarde, el rediseño del frontend añadió portadas de Open Library por ISBN como mejora visual (ver 4.3).
- Reseñas propias: no forman parte de la spec. El frontend muestra valoraciones provisionales de Open Library (ver 4.3).

### 1.5 Entregables

- API REST (Node.js 24 + Express 5 + Mongoose 8 sobre MongoDB como *replica set*).
- SPA (React 19 + Vite + React Router 7 + Tailwind CSS 4).
- Scripts de datos: `seed` (géneros y administrador inicial) y `seed:demo` (catálogo de demostración).
- Pruebas automáticas unitarias y de integración con cobertura ≥ 70 %, e integración continua con lint, pruebas y licencias.
- Documentación: constitución, spec, plan, research, modelo de datos, contratos, quickstart, tareas y `README.md`.

### 1.6 Restricciones (de la constitución)

- El stack es fijo y solo se usan versiones estables: sin SSR ni Next.js, sin Bootstrap ni estilos en línea, y sin Redux.
- Seguridad: JWT en cookie `httpOnly`, `secure` y `sameSite: 'strict'`; RBAC con middlewares; bcrypt con ≥ 10 rondas; secretos en variables de entorno; entradas saneadas.
- Solo MongoDB a través de Mongoose; nada de SQL.
- Endpoints por debajo de 200 ms, índices en las consultas frecuentes y una única conexión a la base de datos.
- Máximo 300 líneas por archivo, ESLint y Prettier sin advertencias, y cobertura ≥ 70 %.
- Auditoría de las operaciones críticas en `audit_logs`.
- Licencias MIT o Apache-2.0 en las dependencias directas (con `dotenv` como excepción).

### 1.7 Supuestos

- Existe un administrador inicial creado al instalar; los demás se nombran desde la gestión de usuarios.
- Hay una única moneda para toda la aplicación (la configurada en `GET /api/config`).
- Un libro tiene un único campo de autor.
- Las bajas de libros y tiendas son definitivas; la auditoría conserva los datos que tenían.
- Solo se tratan el nombre y el correo como datos personales, conforme al GDPR y la normativa local.
- La interfaz está en español.

### 1.8 Criterios de aceptación del producto

| ID | Criterio |
|----|----------|
| SC-001 | Un visitante encuentra un libro y ve dónde está disponible en menos de 30 s. |
| SC-002 | El 95 % de las búsquedas responden en menos de 1 s con 10 000 libros y 500 tiendas. |
| SC-003 | Un administrador da de alta un libro y lo asocia a una tienda en menos de 2 min. |
| SC-004 | El registro de una cuenta se completa en menos de 1 min. |
| SC-005 | El 100 % de las altas, cambios y bajas de libros y tiendas quedan auditadas. |
| SC-006 | El 0 % de las operaciones de gestión de no administradores tiene éxito. |
| SC-007 | El 90 % de los visitantes encuentra al primer intento un libro que existe. |
| SC-008 | Un usuario reserva un libro desde su detalle en menos de 1 min. |
| SC-009 | Cero sobrerreservas, incluso con reservas simultáneas. |
| SC-010 | El 100 % de las reservas vencidas caducan y liberan su unidad sin intervención manual. |

## 2. Épicas

| Épica | Nombre | Objetivo | Historias de la spec | Prioridad | Tareas |
|-------|--------|----------|----------------------|-----------|--------|
| EP-01 | Catálogo público | Que cualquiera encuentre un libro y sepa en qué tiendas está, a qué precio y con cuántas unidades. | US1 | P1 (MVP) | T039–T053 (15) |
| EP-02 | Gestión de libros | Que los administradores mantengan el catálogo con datos válidos y auditados. | US2 | P1 | T054–T065 (12) |
| EP-03 | Puntos de venta e inventario | Que los administradores mantengan las tiendas y qué libros ofrece cada una, con stock y precio. | US3 | P1 | T066–T078 (13) |
| EP-04 | Cuentas y acceso | Que cualquiera pueda crear su cuenta y entrar de forma segura, con permisos por rol. | US4 (y la sesión de la fase 2) | P2 | T079–T087 (9), más T020–T023 y T033–T036 de la base |
| EP-05 | Reservas | Que un usuario se asegure un ejemplar en una tienda, sin sobrerreservas y con caducidad automática. | US5 | P2 | T088–T106 (19) |
| EP-06 | Favoritos | Que un usuario guarde los libros que le interesan y vea su disponibilidad. | US6 | P3 | T107–T116 (10) |
| EP-07 | Administración de usuarios y auditoría | Que los administradores gestionen cuentas y roles, y reconstruyan quién cambió qué y cuándo. | US7 | P3 | T117–T127 (11) |
| EP-08 | Base técnica y calidad | Habilitar el desarrollo y cumplir las puertas de calidad de la constitución. | Fases 1, 2 y 10 | Transversal | T001–T038 (38) y T128–T135 (8) |

## 3. Historias de usuario

Formato: *Como* rol, *quiero* acción, *para* beneficio. Los criterios de aceptación resumen los escenarios de la spec.

### EP-01 Catálogo público

**HU-01. Ver el catálogo** · P1 · FR-009

Como visitante, quiero ver un listado paginado de libros con título, autor, género y precio, para explorar lo que ofrece Bookia sin crear una cuenta.
- Se muestran 20 libros por página, con o sin sesión.

**HU-02. Buscar por título o autor** · P1 · FR-010

Como visitante, quiero buscar por parte del título o del autor sin preocuparme de mayúsculas ni tildes, para encontrar un libro aunque no recuerde su nombre exacto.
- Buscar «cien años» encuentra «Cien años de soledad» con cualquier combinación de mayúsculas y minúsculas.
- Los caracteres especiales o los textos muy largos se tratan como texto literal, sin errores.

**HU-03. Filtrar por género** · P1 · FR-011, FR-016

Como visitante, quiero filtrar por género y combinarlo con la búsqueda, para acotar los resultados.
- Con el filtro «Novela» solo aparecen novelas; con filtro y búsqueda se aplican los dos criterios.

**HU-04. Ver el detalle y la disponibilidad** · P1 · FR-012

Como visitante, quiero ver el detalle de un libro con las tiendas donde está, para saber dónde conseguirlo.
- El detalle muestra título, autor, género, ISBN, precio de referencia y descripción.
- Cada tienda aparece con nombre, dirección, horario, precio en esa tienda y unidades disponibles, o «agotado».
- Si el libro no está en ninguna tienda, se muestra un aviso claro.
- La URL de un libro eliminado muestra una página de «no encontrado».

**HU-05. Búsqueda sin resultados** · P1 · Historia 1, escenario 6

Como visitante, quiero un mensaje claro cuando no hay resultados y una forma de limpiar los filtros, para no quedarme atascado.

### EP-02 Gestión de libros

**HU-06. Dar de alta un libro** · P1 · FR-013 a FR-016, FR-026

Como administrador, quiero crear libros con sus datos validados, para que el catálogo tenga información correcta.
- Son obligatorios título, autor, género (de la lista predefinida), ISBN y precio.
- Un ISBN repetido o mal formado se rechaza, igual que un precio negativo o con más de 2 decimales, indicando qué campo falla.
- El libro aparece en el catálogo público y el alta queda en la auditoría.

**HU-07. Editar un libro** · P1 · FR-013, FR-026

Como administrador, quiero modificar los datos de un libro, para corregirlos o actualizarlos.
- Si dos administradores editan a la vez, se conserva el último guardado y ambos cambios quedan auditados.

**HU-08. Eliminar un libro** · P1 · FR-017, FR-022f, FR-026

Como administrador, quiero eliminar un libro tras confirmar y conociendo su impacto, para retirar del catálogo lo que ya no se ofrece.
- La confirmación avisa de las tiendas, reservas activas y favoritos afectados.
- El libro desaparece del catálogo, de las tiendas y de los favoritos, y sus reservas activas pasan a «cancelada» con el motivo.
- Un usuario que no es administrador no puede crear, editar ni eliminar libros.

### EP-03 Puntos de venta e inventario

**HU-09. Gestionar tiendas** · P1 · FR-018, FR-026

Como administrador, quiero crear, editar y eliminar establecimientos con nombre, dirección, horario y teléfono opcional, para que el catálogo refleje las tiendas reales.

**HU-10. Asociar libros a una tienda** · P1 · FR-019, FR-020

Como administrador, quiero asociar libros a una tienda con su stock y un precio propio opcional, para indicar dónde está cada título y a qué precio.
- Con 5 unidades y precio 18,50, el detalle público muestra esa tienda con esos datos.
- Sin precio propio se usa el precio de referencia del libro.
- No se puede asociar dos veces el mismo libro a la misma tienda.

**HU-11. Ajustar el stock** · P1 · FR-020a

Como administrador, quiero actualizar el stock sin dejarlo por debajo de lo reservado, para no romper reservas existentes.
- Con 3 unidades y 2 reservas activas, fijar el stock en 1 se rechaza indicando las 2 reservadas.

**HU-12. Eliminar una tienda** · P1 · FR-021, FR-022f

Como administrador, quiero eliminar una tienda tras confirmar, para retirar establecimientos cerrados sin borrar los libros.
- La tienda desaparece de todos los detalles, los libros siguen en el catálogo y las reservas activas en ella pasan a «cancelada».

### EP-04 Cuentas y acceso

**HU-13. Registrarse** · P2 · FR-001, FR-002, FR-006

Como visitante, quiero crear una cuenta con nombre, correo y contraseña, para usar las funciones de usuario registrado.
- La cuenta se crea con rol de usuario registrado y queda con sesión iniciada.
- Un correo ya registrado (sin distinguir mayúsculas) se rechaza con un mensaje claro.
- La contraseña debe tener al menos 8 caracteres con letras y números.

**HU-14. Iniciar y cerrar sesión** · P2 · FR-003, FR-005, FR-008

Como usuario, quiero iniciar y cerrar sesión de forma segura, para acceder a mi cuenta y protegerla.
- Las credenciales incorrectas dan un mensaje genérico que no revela si el correo existe.
- La sesión caduca a las 24 h y, al cerrarla, se pierde el acceso a las funciones con cuenta.

**HU-15. Bloqueo por intentos fallidos** · P2 · FR-004

Como usuario, quiero que mi cuenta se bloquee tras varios intentos fallidos, para protegerla de ataques de fuerza bruta.
- Tras 5 fallos seguidos, la cuenta se bloquea 15 minutos.

**HU-16. Permisos por rol** · P2 · FR-006, FR-007

Como responsable del sistema, quiero que cada operación de gestión verifique el rol en el servidor, para que nadie sin permisos pueda ejecutarla aunque conozca la URL.
- Un anónimo recibe 401 y un usuario no administrador recibe 403 en todas las rutas de gestión (SC-006).

### EP-05 Reservas

**HU-17. Reservar un ejemplar** · P2 · FR-022, FR-022a, FR-022b, FR-022h

Como usuario registrado, quiero reservar un ejemplar en una tienda con existencias, para asegurarme de que me lo guardan.
- La reserva se crea «pendiente», guarda el precio del momento y resta una unidad disponible.
- Si la tienda está agotada, no se ofrece reservar.
- Si dos usuarios reservan a la vez la última unidad, solo uno lo consigue.
- No se permite una segunda reserva activa del mismo libro en la misma tienda, ni más de 5 activas en total.
- Un visitante que pulsa «Reservar» es invitado a iniciar sesión o registrarse.

**HU-18. Consultar y cancelar mis reservas** · P2 · FR-022c, FR-022g, FR-022j

Como usuario registrado, quiero ver mis reservas con su estado y cancelarlas mientras estén activas, para organizar mis recogidas.
- «Mis reservas» muestra libro, tienda, precio, estado, fecha de creación y, si procede, fecha límite y motivo de cancelación.
- Al cancelar, la unidad vuelve a estar disponible.

**HU-19. Gestionar el ciclo de las reservas** · P2 · FR-022c, FR-022e, FR-022g

Como administrador, quiero listar las reservas filtradas por estado y tienda y marcarlas como listas o recogidas, para reflejar lo que me comunican las tiendas.
- Al marcarla como lista, el usuario ve la fecha límite de recogida.
- Al marcarla como recogida, el stock de la tienda baja una unidad de forma definitiva.

**HU-20. Caducidad automática** · P2 · FR-022d, SC-010

Como sistema, quiero caducar las reservas vencidas (7 días sin prepararse o 3 sin recogerse), para liberar las unidades sin intervención manual.

**HU-21. Cancelación en cascada** · P2 · FR-022f

Como usuario afectado, quiero ver canceladas con su motivo las reservas de un libro o una tienda eliminados, o de mi cuenta desactivada, para saber por qué ya no siguen activas.

### EP-06 Favoritos

**HU-22. Marcar favoritos** · P3 · FR-022i

Como usuario registrado, quiero marcar y desmarcar libros como favoritos desde el catálogo o el detalle, para guardar los que me interesan.
- El icono refleja si el libro es favorito; un visitante es invitado a iniciar sesión.

**HU-23. Consultar mis favoritos** · P3 · FR-022i, FR-022j

Como usuario registrado, quiero ver mis favoritos con su disponibilidad actual, para saber cuáles puedo conseguir ya.
- Cada usuario solo ve los suyos, y un libro eliminado desaparece de la lista.

### EP-07 Administración de usuarios y auditoría

**HU-24. Gestionar roles** · P3 · FR-023, FR-024, FR-027

Como administrador, quiero ver los usuarios (sin contraseñas) y cambiar su rol, para nombrar a otros administradores.
- El último administrador activo no puede quitarse el rol.

**HU-25. Desactivar y reactivar cuentas** · P3 · FR-023, FR-025, FR-022f

Como administrador, quiero desactivar o reactivar cuentas, para bloquear el acceso de quien no deba usar el sistema.
- Una cuenta desactivada no puede iniciar sesión y pierde el acceso en su siguiente acción; sus reservas activas se cancelan.

**HU-26. Consultar la auditoría** · P3 · FR-026 a FR-029, SC-005

Como administrador, quiero consultar la auditoría ordenada de la más reciente a la más antigua y filtrada por tipo de elemento, para reconstruir quién cambió qué y cuándo.
- Cada entrada muestra usuario, acción, elemento afectado y fecha y hora, y no se puede modificar ni borrar.

### EP-08 Base técnica y calidad (elementos habilitadores)

| ID | Elemento | Origen | Tareas |
|----|----------|--------|--------|
| HT-01 | Monorepo, ESLint, Prettier, `.env.example`, control de licencias e integración continua | Fase 1, constitución | T001–T007 |
| HT-02 | Configuración, conexión única a MongoDB, errores, validación, transacciones, modelos base, auditoría, sesión y roles, *seed*, y base de la SPA | Fase 2 | T008–T038 |
| HT-03 | Pruebas de autorización por rol en todas las rutas de gestión | SC-006, FR-007 | T128 |
| HT-04 | Pruebas de rendimiento (< 200 ms e índices sin `COLLSCAN`) | Principio IV, SC-002 | T129 |
| HT-05 | Lint sin advertencias, archivos de 300 líneas como máximo, cobertura ≥ 70 % y licencias | Principios V y VI | T130–T132 |
| HT-06 | Accesibilidad y diseño *responsive* a 360 px | Calidad transversal | T133 |
| HT-07 | `README.md` y recorrido manual de los escenarios de `quickstart.md` | Fase 10 | T134–T135 |

## 4. Product Backlog

### 4.1 Backlog priorizado

El orden sigue las prioridades de la spec (P1 → P2 → P3) y las dependencias de `tasks.md`: la base técnica bloquea todo; US2 y US3 dependen del modelo de US1; las reservas dependen de US3 y US4.

| Orden | ID | Elemento | Épica | Prioridad | Estado |
|-------|----|----------|-------|-----------|--------|
| 1 | HT-01 | Infraestructura del proyecto | EP-08 | Habilitador | Hecho |
| 2 | HT-02 | Base técnica (configuración, sesión, roles y auditoría) | EP-08 | Habilitador | Hecho |
| 3 | HU-14 | Iniciar y cerrar sesión | EP-04 | P2 (adelantada: la necesita el administrador) | Hecho |
| 4 | HU-16 | Permisos por rol | EP-04 | P2 (adelantada) | Hecho |
| 5 | HU-01 | Ver el catálogo | EP-01 | P1 | Hecho |
| 6 | HU-02 | Buscar por título o autor | EP-01 | P1 | Hecho |
| 7 | HU-03 | Filtrar por género | EP-01 | P1 | Hecho |
| 8 | HU-04 | Ver el detalle y la disponibilidad | EP-01 | P1 | Hecho |
| 9 | HU-05 | Búsqueda sin resultados | EP-01 | P1 | Hecho |
| 10 | HU-06 | Dar de alta un libro | EP-02 | P1 | Hecho |
| 11 | HU-07 | Editar un libro | EP-02 | P1 | Hecho |
| 12 | HU-08 | Eliminar un libro | EP-02 | P1 | Hecho |
| 13 | HU-09 | Gestionar tiendas | EP-03 | P1 | Hecho |
| 14 | HU-10 | Asociar libros a una tienda | EP-03 | P1 | Hecho |
| 15 | HU-11 | Ajustar el stock | EP-03 | P1 | Hecho |
| 16 | HU-12 | Eliminar una tienda | EP-03 | P1 | Hecho |
| 17 | HU-13 | Registrarse | EP-04 | P2 | Hecho |
| 18 | HU-15 | Bloqueo por intentos fallidos | EP-04 | P2 | Hecho |
| 19 | HU-17 | Reservar un ejemplar | EP-05 | P2 | Hecho |
| 20 | HU-18 | Consultar y cancelar mis reservas | EP-05 | P2 | Hecho |
| 21 | HU-19 | Gestionar el ciclo de las reservas | EP-05 | P2 | Hecho |
| 22 | HU-20 | Caducidad automática | EP-05 | P2 | Hecho |
| 23 | HU-21 | Cancelación en cascada | EP-05 | P2 | Hecho |
| 24 | HU-22 | Marcar favoritos | EP-06 | P3 | Hecho |
| 25 | HU-23 | Consultar mis favoritos | EP-06 | P3 | Hecho |
| 26 | HU-24 | Gestionar roles | EP-07 | P3 | Hecho |
| 27 | HU-25 | Desactivar y reactivar cuentas | EP-07 | P3 | Hecho |
| 28 | HU-26 | Consultar la auditoría | EP-07 | P3 | Hecho |
| 29 | HT-03 | Pruebas de autorización | EP-08 | Calidad | Hecho |
| 30 | HT-04 | Pruebas de rendimiento | EP-08 | Calidad | Hecho |
| 31 | HT-05 | Lint, cobertura y licencias | EP-08 | Calidad | Hecho |
| 32 | HT-06 | Accesibilidad y móvil | EP-08 | Calidad | Hecho |
| 33 | HT-07 | README y validación manual | EP-08 | Calidad | README hecho; falta la validación manual (T135) |

### 4.2 Plan de entregas (incrementos)

Según la estrategia de entrega incremental de `tasks.md`:

| Incremento | Contenido | Resultado demostrable |
|------------|-----------|-----------------------|
| 0. Base | HT-01, HT-02, HU-14, HU-16 | La API arranca, el *seed* crea géneros y administrador, y se puede iniciar y cerrar sesión. |
| 1. MVP | EP-01 (HU-01 a HU-05) | Catálogo público con la disponibilidad por tienda, con datos de demostración. |
| 2. Gestión (completa el P1) | EP-02 y EP-03 (HU-06 a HU-12) | Los administradores mantienen libros, tiendas e inventario reales. |
| 3. Registro abierto | HU-13, HU-15 | Cualquiera crea su cuenta de forma segura. |
| 4. Reservas | EP-05 (HU-17 a HU-21) | Reservas de principio a fin, sin sobrerreservas y con caducidad automática. |
| 5. Favoritos y administración | EP-06 y EP-07 (HU-22 a HU-26) | Favoritos, gestión de usuarios y auditoría. |
| 6. Pulido | HT-03 a HT-07 | Puertas de calidad de la constitución cumplidas. |

### 4.3 Elementos añadidos fuera del backlog inicial

Se hicieron después de `tasks.md` y están recogidos en `CLAUDE.md`:

| Elemento | Estado |
|----------|--------|
| Género Manga y 83 cómics y mangas de demostración | Hecho |
| Sinopsis de todos los libros de demostración | Hecho |
| Rediseño del frontend: cabecera con búsqueda y menú lateral, portada de estilo editorial, ficha del libro en tres columnas y portadas de Open Library por ISBN | Hecho |
| Valoraciones provisionales con datos de Open Library (Bookia aún no tiene reseñas propias; se cambiarán cuando exista el endpoint) | Hecho (provisional) |

### 4.4 Pendiente

- **T135**: recorrido manual de los 8 escenarios de `quickstart.md`, anotado en `checklists/validation.md`. Lo hace el responsable del proyecto con sus cuentas.
