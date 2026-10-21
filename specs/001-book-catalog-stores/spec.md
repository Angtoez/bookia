# Feature Specification: Bookia: catálogo de libros y puntos de venta

**Feature Branch**: `001-book-catalog-stores`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Construir 'Bookia', una aplicación web para consultar libros y saber en qué puntos de venta están disponibles. Roles: visitante (consulta sin sesión), usuario registrado y administrador (gestiona libros, puntos de venta y usuarios). Features: registro e inicio de sesión; catálogo con búsqueda por título o autor, filtro por género y detalle con puntos de venta; gestión de libros y de puntos de venta por el administrador, con asociación de libros a establecimientos; auditoría de altas, cambios y bajas de libros y establecimientos. Fuera de alcance: pagos, carrito de compras y app móvil." (fuente completa: `../spec-input.md`)

## Clarifications

### Session 2026-10-13

- Q: ¿Qué puede hacer el usuario registrado además de lo que hace un visitante? → A: Guardar favoritos y reservar libros en un punto de venta (historias 5 y 6).
- Q: ¿Qué datos guarda la asociación libro–establecimiento? → A: Stock y precio propio de la tienda (FR-020).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el catálogo y la disponibilidad de un libro (Priority: P1)

Un visitante, sin iniciar sesión, entra en Bookia, recorre el listado de libros, busca por título o autor, filtra por género y abre el detalle de un libro. En el detalle ve sus datos y la lista de puntos de venta donde está disponible, con la dirección y el horario de cada uno.

**Why this priority**: Es la razón de ser de Bookia: saber dónde conseguir un libro. Sin esta historia el resto no aporta valor al público.

**Independent Test**: Con libros y puntos de venta precargados, un visitante sin cuenta puede encontrar un libro concreto por título y ver en qué establecimientos está disponible.

**Acceptance Scenarios**:

1. **Given** un catálogo con libros, **When** un visitante abre el catálogo, **Then** ve un listado paginado con título, autor, género y precio de cada libro.
2. **Given** un catálogo que contiene "Cien años de soledad", **When** el visitante busca "cien años" (en cualquier combinación de mayúsculas y minúsculas), **Then** el libro aparece en los resultados.
3. **Given** libros de varios géneros, **When** el visitante filtra por "Novela", **Then** solo ve libros de ese género; y si además escribe un término de búsqueda, se aplican ambos criterios a la vez.
4. **Given** un libro asociado a dos puntos de venta, **When** el visitante abre su detalle, **Then** ve título, autor, género, ISBN, precio de referencia y descripción, y los dos establecimientos con nombre, dirección, horario, precio en esa tienda y unidades disponibles (o "agotado").
5. **Given** un libro sin puntos de venta asociados, **When** el visitante abre su detalle, **Then** ve un aviso claro de que no está disponible en ningún establecimiento.
6. **Given** una búsqueda sin coincidencias, **When** se muestran los resultados, **Then** el visitante ve un mensaje de "sin resultados" y la opción de limpiar los filtros.

---

### User Story 2 - Gestionar libros (Priority: P1)

Un administrador inicia sesión y da de alta, edita y elimina libros del catálogo. Cada operación queda registrada en el historial de auditoría.

**Why this priority**: Sin libros cargados el catálogo está vacío; es la otra mitad imprescindible del MVP.

**Independent Test**: Un administrador crea un libro, lo edita y lo elimina; los cambios se reflejan en el catálogo público y quedan tres entradas en la auditoría.

**Acceptance Scenarios**:

1. **Given** un administrador con sesión iniciada, **When** crea un libro con todos los campos obligatorios válidos, **Then** el libro aparece en el catálogo público.
2. **Given** un libro con ISBN 978-84-376-0494-7 ya registrado, **When** el administrador intenta crear otro con el mismo ISBN, **Then** el sistema lo rechaza e indica que el ISBN ya existe.
3. **Given** un formulario con ISBN mal formado o precio negativo, **When** el administrador lo envía, **Then** el sistema indica qué campos son inválidos y no guarda nada.
4. **Given** un libro existente, **When** el administrador lo elimina y confirma, **Then** desaparece del catálogo y de todos los puntos de venta a los que estaba asociado.
5. **Given** un usuario que no es administrador (o un visitante), **When** intenta crear, editar o eliminar un libro, **Then** el sistema lo impide.

---

### User Story 3 - Gestionar puntos de venta y su oferta de libros (Priority: P1)

Un administrador da de alta, edita y elimina establecimientos, y asocia o desasocia libros a cada uno para indicar dónde está disponible cada título.

**Why this priority**: La disponibilidad por establecimiento es lo que diferencia a Bookia de un simple catálogo; sin ella la historia 1 no puede responder "dónde comprarlo".

**Independent Test**: Un administrador crea un establecimiento, le asocia un libro existente y comprueba que el detalle público de ese libro muestra el establecimiento.

**Acceptance Scenarios**:

1. **Given** un administrador con sesión iniciada, **When** crea un establecimiento con nombre, dirección y horario, **Then** queda disponible para asociarle libros.
2. **Given** un establecimiento y un libro con precio de referencia 20,00, **When** el administrador asocia el libro al establecimiento con 5 unidades y precio 18,50, **Then** el detalle público del libro muestra ese establecimiento con 5 unidades y precio 18,50.
3. **Given** una asociación creada sin precio propio, **When** se muestra el detalle del libro, **Then** el precio en ese establecimiento es el precio de referencia del libro.
4. **Given** un libro ya asociado a un establecimiento, **When** el administrador intenta asociarlo de nuevo al mismo, **Then** el sistema no crea un duplicado.
5. **Given** una asociación con 3 unidades y 2 reservas activas, **When** el administrador intenta fijar el stock en 1, **Then** el sistema lo impide e indica que hay 2 unidades reservadas.
6. **Given** un establecimiento con libros asociados, **When** el administrador lo elimina y confirma, **Then** desaparece de los detalles de todos esos libros; los libros siguen en el catálogo y las reservas activas en ese establecimiento pasan a "cancelada".

---

### User Story 4 - Registrarse e iniciar sesión (Priority: P2)

Una persona crea una cuenta con nombre, correo y contraseña; después inicia y cierra sesión.

**Why this priority**: Es necesaria para que los administradores operen y para las funciones del usuario registrado, pero el catálogo público funciona sin ella.

**Independent Test**: Registrar una cuenta nueva, cerrar sesión, volver a entrar con las mismas credenciales y comprobar que el sistema reconoce al usuario.

**Acceptance Scenarios**:

1. **Given** un correo no registrado, **When** la persona se registra con nombre, correo válido y una contraseña que cumple la política, **Then** se crea la cuenta con rol de usuario registrado y queda con sesión iniciada.
2. **Given** un correo ya registrado, **When** alguien intenta registrarse con él, **Then** el sistema lo rechaza con un mensaje claro.
3. **Given** credenciales incorrectas, **When** la persona intenta iniciar sesión, **Then** ve un mensaje genérico que no revela si el correo existe.
4. **Given** una sesión iniciada, **When** la persona cierra sesión, **Then** deja de tener acceso a las funciones que requieren cuenta hasta volver a entrar.

---

### User Story 5 - Reservar un libro en un punto de venta (Priority: P2)

Un usuario registrado, desde el detalle de un libro, reserva un ejemplar en un establecimiento con existencias para recogerlo y pagarlo allí. Consulta sus reservas en "Mis reservas" y puede cancelarlas mientras no se hayan recogido. Un administrador gestiona el ciclo de vida de las reservas: las marca como listas para recoger, como recogidas o las cancela.

**Why this priority**: Es la función que más valor da a tener cuenta: convierte "saber dónde está" en "asegurarme de que me lo guardan". Depende del stock por establecimiento (historia 3), pero el catálogo público funciona sin ella.

**Independent Test**: Con un libro con 1 unidad en un establecimiento, un usuario registrado lo reserva; el detalle público muestra el libro como agotado en ese establecimiento; el administrador marca la reserva como lista y luego como recogida; el usuario ve cada cambio de estado en "Mis reservas".

**Acceptance Scenarios**:

1. **Given** un usuario registrado y un libro con 3 unidades disponibles en un establecimiento, **When** reserva un ejemplar allí, **Then** se crea una reserva en estado "pendiente" y las unidades disponibles de ese libro en ese establecimiento pasan a 2.
2. **Given** un libro con 0 unidades disponibles en un establecimiento, **When** el usuario abre su detalle, **Then** ese establecimiento aparece como "agotado" y no ofrece la opción de reservar.
3. **Given** una única unidad disponible, **When** dos usuarios intentan reservarla a la vez, **Then** solo una reserva se crea y el otro usuario recibe un aviso de que ya no hay existencias.
4. **Given** un usuario con una reserva activa de un libro en un establecimiento, **When** intenta reservar el mismo libro en el mismo establecimiento, **Then** el sistema lo impide y le indica que ya tiene esa reserva.
5. **Given** una reserva "pendiente" o "lista para recoger", **When** el usuario la cancela, **Then** pasa a "cancelada" y la unidad vuelve a estar disponible.
6. **Given** una reserva "pendiente", **When** el administrador la marca como "lista para recoger", **Then** el usuario ve el nuevo estado y la fecha límite de recogida en "Mis reservas".
7. **Given** una reserva "lista para recoger", **When** el administrador la marca como "recogida", **Then** la reserva se cierra y el stock del establecimiento se reduce en una unidad de forma definitiva.
8. **Given** una reserva "lista para recoger" no recogida en el plazo, **When** vence el plazo, **Then** pasa a "caducada" y la unidad vuelve a estar disponible.
9. **Given** un visitante sin sesión, **When** pulsa "reservar", **Then** se le invita a iniciar sesión o registrarse.

---

### User Story 6 - Guardar libros favoritos (Priority: P3)

Un usuario registrado marca libros como favoritos desde el catálogo o el detalle y los consulta después en "Mis favoritos", con su disponibilidad actual.

**Why this priority**: Es una comodidad para usuarios recurrentes, sencilla y sin impacto en el resto del sistema.

**Independent Test**: Un usuario marca dos libros como favoritos, cierra sesión, vuelve a entrar y los ve en "Mis favoritos"; quita uno y desaparece de la lista.

**Acceptance Scenarios**:

1. **Given** un usuario registrado, **When** marca un libro como favorito, **Then** el libro aparece en "Mis favoritos" y el icono del libro refleja que es favorito.
2. **Given** un libro en favoritos, **When** el usuario lo desmarca, **Then** desaparece de "Mis favoritos".
3. **Given** un libro en favoritos que un administrador elimina del catálogo, **When** el usuario abre "Mis favoritos", **Then** ese libro ya no aparece.
4. **Given** dos usuarios distintos, **When** cada uno consulta "Mis favoritos", **Then** solo ve los suyos.
5. **Given** un visitante sin sesión, **When** pulsa "favorito", **Then** se le invita a iniciar sesión o registrarse.

---

### User Story 7 - Administrar usuarios y consultar la auditoría (Priority: P3)

Un administrador consulta la lista de usuarios, cambia el rol de un usuario (usuario registrado ↔ administrador) y desactiva o reactiva cuentas. También consulta el historial de auditoría de libros y establecimientos.

**Why this priority**: Es necesario para operar el sistema a medio plazo, pero el MVP puede funcionar con un administrador inicial creado al instalar.

**Independent Test**: Un administrador promueve a un usuario a administrador, el usuario promovido accede a la gestión de libros, y el historial de auditoría muestra las operaciones que hizo.

**Acceptance Scenarios**:

1. **Given** un administrador, **When** abre la gestión de usuarios, **Then** ve nombre, correo, rol y estado (activo/desactivado) de cada cuenta, sin ver contraseñas.
2. **Given** un usuario activo, **When** el administrador lo desactiva, **Then** ese usuario no puede iniciar sesión y, si tenía una sesión abierta, pierde el acceso en su siguiente acción.
3. **Given** que solo queda un administrador activo, **When** intenta quitarse el rol o desactivarse, **Then** el sistema lo impide.
4. **Given** operaciones previas sobre libros y establecimientos, **When** el administrador consulta la auditoría, **Then** ve cada operación con usuario, acción, elemento afectado y fecha y hora, ordenadas de la más reciente a la más antigua.

---

### Edge Cases

- Dos administradores editan el mismo libro a la vez: se conserva el último guardado y ambos cambios quedan en la auditoría.
- Búsquedas con caracteres especiales o texto muy largo: se tratan como texto literal y no provocan errores ni resultados inesperados.
- Un usuario falla el inicio de sesión repetidamente: tras 5 intentos fallidos seguidos, la cuenta se bloquea temporalmente 15 minutos.
- Un usuario con sesión iniciada es degradado de administrador a usuario: pierde el acceso a la gestión en su siguiente acción.
- Se accede a la URL de un libro o establecimiento eliminado: se muestra una página de "no encontrado" amigable.
- Se elimina un libro o establecimiento por error: la baja requiere confirmación previa y queda en la auditoría con los datos que tenía.
- La sesión caduca mientras el administrador rellena un formulario: se le pide volver a iniciar sesión sin que el sistema guarde datos parciales.
- Se elimina un libro con reservas activas: la baja requiere confirmación avisando del número de reservas afectadas, y esas reservas pasan a "cancelada"; el usuario lo ve en "Mis reservas" con el motivo.
- Se desactiva una cuenta con reservas activas: sus reservas pasan a "cancelada" y las unidades vuelven a estar disponibles.
- Un usuario alcanza el máximo de reservas activas: el sistema le impide crear otra y le indica cuántas tiene.
- El precio propio de una tienda se cambia después de reservar: la reserva conserva el precio que tenía en el momento de crearla.

## Requirements *(mandatory)*

### Functional Requirements

**Cuentas y acceso**

- **FR-001**: El sistema MUST permitir registrarse con nombre, correo electrónico y contraseña; el correo MUST ser único (sin distinguir mayúsculas y minúsculas).
- **FR-002**: El sistema MUST exigir contraseñas de al menos 8 caracteres que incluyan letras y números.
- **FR-003**: El sistema MUST permitir iniciar y cerrar sesión; los mensajes de error de inicio de sesión MUST NOT revelar si un correo está registrado.
- **FR-004**: El sistema MUST bloquear temporalmente (15 minutos) una cuenta tras 5 intentos fallidos consecutivos de inicio de sesión.
- **FR-005**: Las sesiones MUST caducar tras 24 horas; después el usuario MUST volver a iniciar sesión.
- **FR-006**: El sistema MUST distinguir tres roles: visitante (sin sesión), usuario registrado y administrador; toda cuenta nueva MUST crearse como usuario registrado.
- **FR-007**: Toda operación de gestión (libros, establecimientos, usuarios, auditoría y cambios de estado de reservas salvo la cancelación por su titular) MUST estar reservada a administradores, y el sistema MUST verificarlo en cada operación, no solo ocultando opciones en pantalla.
- **FR-008**: El sistema MUST NOT almacenar ni mostrar contraseñas en forma legible.

**Catálogo público**

- **FR-009**: Cualquier persona, con o sin sesión, MUST poder ver el catálogo paginado (20 libros por página) con título, autor, género y precio.
- **FR-010**: El sistema MUST permitir buscar libros por coincidencia parcial en el título o en el autor, sin distinguir mayúsculas, minúsculas ni tildes.
- **FR-011**: El sistema MUST permitir filtrar por género y combinar el filtro con la búsqueda.
- **FR-012**: El detalle de un libro MUST mostrar título, autor, género, ISBN, precio de referencia, descripción y la lista de establecimientos asociados, con nombre, dirección, horario, precio en esa tienda y unidades disponibles de cada uno; los establecimientos sin unidades disponibles MUST mostrarse como "agotado".

**Gestión de libros**

- **FR-013**: Los administradores MUST poder crear, editar y eliminar libros. Son obligatorios título, autor, género, ISBN y precio; son opcionales descripción, editorial y año de publicación.
- **FR-014**: El ISBN MUST ser un ISBN-10 o ISBN-13 válido y único en el catálogo.
- **FR-015**: El precio MUST ser un importe mayor o igual que cero con un máximo de dos decimales.
- **FR-016**: El género MUST elegirse de una lista de géneros predefinida, para que el filtro sea coherente.
- **FR-017**: Eliminar un libro MUST requerir confirmación y MUST quitarlo de todos los establecimientos a los que estaba asociado.

**Gestión de puntos de venta**

- **FR-018**: Los administradores MUST poder crear, editar y eliminar establecimientos. Son obligatorios nombre, dirección y horario; es opcional el teléfono de contacto.
- **FR-019**: Los administradores MUST poder asociar y desasociar libros a un establecimiento; MUST NOT existir asociaciones duplicadas del mismo libro con el mismo establecimiento.
- **FR-020**: La asociación libro–establecimiento MUST registrar el stock (número entero de unidades, mayor o igual que cero) y, opcionalmente, un precio propio de la tienda (mismas reglas que FR-015). Si no hay precio propio, el precio en esa tienda MUST ser el precio de referencia del libro.
- **FR-020a**: Las unidades disponibles de un libro en un establecimiento MUST calcularse como el stock menos las reservas activas ("pendiente" o "lista para recoger"); el sistema MUST NOT permitir fijar un stock inferior a las unidades reservadas.
- **FR-021**: Eliminar un establecimiento MUST requerir confirmación y MUST eliminar sus asociaciones sin borrar los libros.

**Reservas**

- **FR-022**: Los usuarios registrados MUST poder reservar un ejemplar de un libro en un establecimiento con al menos una unidad disponible. Cada reserva es de una unidad y guarda el precio de la tienda en el momento de crearla.
- **FR-022a**: Un usuario MUST NOT tener más de una reserva activa del mismo libro en el mismo establecimiento, ni más de 5 reservas activas en total.
- **FR-022b**: El sistema MUST garantizar que nunca existan más reservas activas que stock, incluso ante reservas simultáneas de la última unidad.
- **FR-022c**: Una reserva MUST pasar por los estados "pendiente" → "lista para recoger" → "recogida", o terminar en "cancelada" o "caducada". Solo los administradores pueden marcarla como "lista para recoger" o "recogida"; el usuario y los administradores pueden cancelarla mientras esté activa.
- **FR-022d**: Una reserva "lista para recoger" MUST pasar automáticamente a "caducada" si no se recoge en 3 días naturales; una reserva "pendiente" MUST pasar a "caducada" si no se marca como lista en 7 días naturales.
- **FR-022e**: Al pasar una reserva a "recogida", el stock de la asociación MUST reducirse en una unidad; al cancelarse o caducar, la unidad MUST volver a estar disponible.
- **FR-022f**: Al eliminar un libro o un establecimiento, o al desactivar una cuenta, sus reservas activas MUST pasar a "cancelada" indicando el motivo.
- **FR-022g**: Los usuarios MUST poder consultar sus reservas ("Mis reservas") con libro, establecimiento, precio, estado y fechas (creación y, si procede, límite de recogida); los administradores MUST poder listar todas las reservas y filtrarlas por estado y establecimiento.
- **FR-022h**: Una reserva MUST NOT implicar ningún pago en la aplicación; el pago se hace en el establecimiento al recoger.

**Favoritos**

- **FR-022i**: Los usuarios registrados MUST poder marcar y desmarcar libros como favoritos y consultar su lista ("Mis favoritos") con la disponibilidad actual de cada libro. Un libro eliminado del catálogo MUST desaparecer de los favoritos.
- **FR-022j**: Las reservas y los favoritos de un usuario MUST ser visibles y modificables solo por él (y, en el caso de las reservas, por los administradores).

**Administración de usuarios**

- **FR-023**: Los administradores MUST poder listar usuarios, cambiar su rol entre usuario registrado y administrador, y desactivar o reactivar cuentas.
- **FR-024**: El sistema MUST garantizar que siempre exista al menos un administrador activo.
- **FR-025**: Una cuenta desactivada MUST NOT poder iniciar sesión, y los cambios de rol o de estado MUST aplicarse en la siguiente acción del usuario afectado.

**Auditoría**

- **FR-026**: Toda alta, modificación o baja de libros y establecimientos, incluidas las asociaciones entre ambos, MUST registrar una entrada de auditoría con el usuario que la hizo, la acción, el elemento afectado y la fecha y hora.
- **FR-027**: Los cambios de rol y de estado de las cuentas, y los cambios de estado de las reservas hechos por administradores o por el sistema (cancelación en cascada y caducidad), MUST quedar también en la auditoría.
- **FR-028**: Las entradas de auditoría MUST NOT poder modificarse ni eliminarse desde la aplicación.
- **FR-029**: Los administradores MUST poder consultar la auditoría ordenada de la más reciente a la más antigua y filtrarla por tipo de elemento (libro, establecimiento, usuario, reserva).

### Key Entities *(include if feature involves data)*

- **Usuario**: persona con cuenta. Nombre, correo único, contraseña protegida, rol (usuario registrado o administrador), estado (activo o desactivado) y fecha de alta.
- **Libro**: título del catálogo. Título, autor, género, ISBN único, precio, descripción, editorial y año de publicación opcionales.
- **Género**: valor de una lista predefinida que clasifica los libros y sirve de filtro.
- **Punto de venta (establecimiento)**: tienda física donde puede conseguirse un libro. Nombre, dirección, horario y teléfono opcional.
- **Disponibilidad (libro en establecimiento)**: relación entre un libro y un establecimiento que indica que el libro se puede conseguir allí; un libro puede estar en muchos establecimientos y un establecimiento puede ofrecer muchos libros. Guarda el stock y un precio propio opcional; las unidades disponibles se calculan restando las reservas activas.
- **Reserva**: petición de un usuario registrado para que un establecimiento le guarde una unidad de un libro. Usuario, libro, establecimiento, precio en el momento de reservar, estado (pendiente, lista para recoger, recogida, cancelada, caducada), motivo de cancelación y fechas de creación, cambio de estado y límite de recogida.
- **Favorito**: marca de un usuario registrado sobre un libro; cada usuario tiene como mucho una por libro.
- **Entrada de auditoría**: registro inmutable de una operación crítica: usuario, acción (alta, modificación, baja), tipo y elemento afectado, y fecha y hora.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante sin cuenta encuentra un libro concreto y ve en qué establecimientos está disponible en menos de 30 segundos desde que entra en la aplicación.
- **SC-002**: El 95 % de las búsquedas y filtrados muestran resultados de forma prácticamente instantánea (menos de 1 segundo percibido por el usuario) con un catálogo de 10 000 libros y 500 establecimientos.
- **SC-003**: Un administrador da de alta un libro completo y lo asocia a un establecimiento en menos de 2 minutos.
- **SC-004**: Una persona completa el registro de su cuenta en menos de 1 minuto.
- **SC-005**: El 100 % de las altas, modificaciones y bajas de libros y establecimientos tienen su entrada de auditoría correspondiente.
- **SC-006**: El 0 % de los intentos de operaciones de gestión por parte de visitantes o usuarios no administradores tiene éxito.
- **SC-007**: El 90 % de los visitantes que buscan un libro existente en el catálogo lo encuentran al primer intento, sin ayuda.
- **SC-008**: Un usuario registrado reserva un libro desde su detalle en menos de 1 minuto.
- **SC-009**: En ningún momento hay más reservas activas que stock en ningún establecimiento (0 sobrerreservas), incluso con reservas simultáneas.
- **SC-010**: El 100 % de las reservas que superan su plazo pasan a "caducada" y liberan su unidad, sin intervención manual.

## Assumptions

- Bookia es una aplicación web para navegador de escritorio y móvil; no habrá app móvil nativa.
- Fuera de alcance: pagos, carrito de compras, envíos, portadas de libros, recuperación de contraseña por correo, verificación de correo, inicio de sesión con redes sociales y el autoservicio de los establecimientos (solo los administradores gestionan su información).
- Existe un administrador inicial creado durante la instalación; los demás administradores se nombran desde la gestión de usuarios.
- El precio que figura en el libro es el precio de referencia del catálogo, en una única moneda configurada para toda la aplicación; el listado del catálogo muestra este precio y el detalle muestra además el de cada tienda.
- Las reservas no son una compra: no hay pago, carrito ni envío; el usuario paga en el establecimiento al recoger. Por eso no contradicen el "fuera de alcance" de pagos y carrito.
- Los establecimientos no acceden a Bookia: los administradores actualizan el estado de las reservas con la información que les dan las tiendas.
- Los cambios de estado de una reserva se comunican al usuario solo dentro de la aplicación ("Mis reservas"); no se envían correos ni notificaciones push.
- Plazos por defecto: 7 días para preparar una reserva pendiente y 3 días para recogerla; máximo 5 reservas activas por usuario. Son valores de negocio que pueden ajustarse en el plan.
- Un libro tiene un único campo de autor; si hay varios autores se escriben juntos en ese campo.
- La lista de géneros se carga al instalar el sistema; su edición desde la aplicación no forma parte de esta versión.
- Las bajas de libros y establecimientos son definitivas en la aplicación; la auditoría conserva los datos que tenían.
- La aplicación solo trata los datos personales mínimos (nombre y correo) y lo hace conforme a la normativa de privacidad aplicable (GDPR y normativa local).
- La interfaz está en español.
