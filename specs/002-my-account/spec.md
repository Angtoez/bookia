# Feature Specification: Mi cuenta

**Feature Branch**: `002-my-account`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Mi cuenta: página de autoservicio para que cada usuario registrado gestione su propia cuenta y ejerza los derechos que promete la política de privacidad (/privacidad). Debe permitir: ver sus datos (nombre, correo, rol, fecha de alta); cambiar su nombre; cambiar su contraseña indicando la actual y cumpliendo la misma política de contraseñas del registro; descargar sus datos (cuenta, reservas y favoritos) en un archivo JSON (derecho de portabilidad y acceso); y borrar su cuenta de forma definitiva confirmando con su contraseña. Al borrar la cuenta se cancelan sus reservas activas (liberando las unidades), se borran sus favoritos y se cierra la sesión; los registros de auditoría que la mencionan no deben conservar su nombre ni su correo. Un administrador no puede borrar su cuenta si es el último administrador activo. Los cambios de nombre, contraseña y el borrado se auditan. Accesible desde el menú de usuario de la cabecera («Mi cuenta») y el menú lateral, para usuarios y administradores. Fuera de alcance: cambiar el correo electrónico, recuperar la contraseña olvidada y enviar correos."

## Contexto

La política de privacidad de Bookia (feature 001, página `/privacidad`) promete los derechos de acceso, rectificación, supresión y portabilidad, pero hoy solo se pueden pedir por correo: la aplicación no deja ver ni cambiar los datos propios, ni borrar la cuenta. El administrador solo puede desactivar cuentas (historia 7 de la feature 001), no borrarlas. Esta feature añade el autoservicio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los datos de mi cuenta y cambiar mi nombre (Priority: P1)

Una persona con sesión iniciada abre «Mi cuenta» desde el menú de usuario de la cabecera o desde el menú lateral. Ve su nombre, su correo, su rol y la fecha en que creó la cuenta. Corrige su nombre y, al guardar, el nuevo nombre aparece en la cabecera sin tener que volver a entrar.

**Why this priority**: Es la base de la página y cubre los derechos de acceso y de rectificación. Las demás historias se colocan en esta misma página.

**Independent Test**: Iniciar sesión, abrir «Mi cuenta», comprobar los cuatro datos, cambiar el nombre y ver el nuevo nombre en la cabecera y en una segunda visita.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada, **When** abre «Mi cuenta», **Then** ve su nombre, su correo, su rol y su fecha de alta.
2. **Given** un usuario en «Mi cuenta», **When** cambia su nombre por uno válido y guarda, **Then** se muestra una confirmación y el nuevo nombre aparece en la cabecera.
3. **Given** un usuario en «Mi cuenta», **When** deja el nombre vacío o con más de 100 caracteres y guarda, **Then** ve un mensaje junto al campo y el nombre no cambia.
4. **Given** un visitante sin sesión, **When** intenta abrir «Mi cuenta», **Then** se le lleva a iniciar sesión y, tras entrar, vuelve a «Mi cuenta».
5. **Given** un usuario que cambia su nombre, **When** un administrador consulta la auditoría, **Then** hay una entrada con el cambio, hecha por ese usuario.

---

### User Story 2 - Cambiar mi contraseña (Priority: P1)

Un usuario quiere cambiar su contraseña. Escribe la actual, la nueva y la repite. La nueva tiene que cumplir la misma política que en el registro. Tras el cambio, sigue con la sesión iniciada en el dispositivo desde el que lo hizo, y las sesiones que tuviera abiertas en otros dispositivos dejan de valer.

**Why this priority**: Es una medida de seguridad básica: hoy, quien sospecha que alguien conoce su contraseña no puede cambiarla.

**Independent Test**: Cambiar la contraseña, cerrar sesión, comprobar que la antigua ya no sirve y que la nueva sí.

**Acceptance Scenarios**:

1. **Given** un usuario en «Mi cuenta», **When** escribe bien su contraseña actual y una nueva que cumple la política, **Then** ve una confirmación, sigue con la sesión iniciada y, a partir de ese momento, solo puede entrar con la nueva.
2. **Given** un usuario en «Mi cuenta», **When** escribe mal su contraseña actual, **Then** ve un mensaje de que la contraseña actual no es correcta y la contraseña no cambia.
3. **Given** un usuario en «Mi cuenta», **When** la nueva contraseña no cumple la política o no coincide con su repetición, **Then** ve el mismo mensaje de la política que en el registro, o que no coinciden, y la contraseña no cambia.
4. **Given** un usuario con sesión iniciada en dos dispositivos, **When** cambia la contraseña en uno, **Then** en el otro la sesión deja de valer y tiene que volver a entrar.
5. **Given** un usuario que cambia su contraseña, **When** un administrador consulta la auditoría, **Then** hay una entrada que indica el cambio de contraseña, sin la contraseña ni su resumen cifrado.

---

### User Story 3 - Borrar mi cuenta (Priority: P2)

Un usuario decide dejar Bookia. En «Mi cuenta», en una zona separada y marcada como peligrosa, pulsa «Borrar mi cuenta». Se le explica qué va a pasar (se cancelan sus reservas activas, se borran sus favoritos y no se puede deshacer) y lo confirma escribiendo su contraseña. Su sesión se cierra, vuelve a la portada y ya no puede entrar con esa cuenta.

**Why this priority**: Cubre el derecho de supresión que promete la política de privacidad. Es menos frecuente que las historias 1 y 2, pero sin ella la política promete algo que la aplicación no hace.

**Independent Test**: Con una cuenta con una reserva activa y un favorito, borrar la cuenta, comprobar que la unidad reservada vuelve a estar disponible, que no se puede iniciar sesión y que la auditoría ya no muestra su nombre ni su correo.

**Acceptance Scenarios**:

1. **Given** un usuario en «Mi cuenta», **When** pulsa «Borrar mi cuenta», **Then** ve un aviso con las consecuencias y un campo para su contraseña, y nada se borra hasta que confirma.
2. **Given** el aviso de borrado, **When** confirma con su contraseña correcta, **Then** la cuenta se borra, su sesión se cierra, vuelve a la portada y ve un mensaje de que su cuenta se ha borrado.
3. **Given** el aviso de borrado, **When** escribe mal la contraseña, **Then** ve un mensaje de que la contraseña no es correcta y la cuenta sigue existiendo.
4. **Given** un usuario con reservas pendientes o listas para recoger, **When** borra su cuenta, **Then** esas reservas quedan canceladas con el motivo «cuenta eliminada» y sus unidades vuelven a estar disponibles.
5. **Given** un usuario con favoritos, **When** borra su cuenta, **Then** sus favoritos desaparecen.
6. **Given** una cuenta borrada, **When** alguien intenta iniciar sesión con su correo y su contraseña, **Then** recibe el mismo mensaje genérico que con unas credenciales incorrectas, y el correo queda libre para registrar una cuenta nueva.
7. **Given** una cuenta borrada, **When** un administrador consulta la auditoría o la lista de reservas, **Then** donde antes aparecían su nombre o su correo aparece «Cuenta eliminada».
8. **Given** el único administrador activo, **When** intenta borrar su cuenta, **Then** ve un mensaje de que no puede hacerlo mientras sea el último administrador, y la cuenta sigue existiendo.

---

### User Story 4 - Descargar mis datos (Priority: P3)

Un usuario quiere saber qué datos guarda Bookia sobre él o llevárselos a otro servicio. En «Mi cuenta» pulsa «Descargar mis datos» y obtiene un archivo con los datos de su cuenta, todas sus reservas y sus favoritos, en un formato estructurado que se puede leer con cualquier editor.

**Why this priority**: Cubre los derechos de acceso y portabilidad. Es el menos urgente porque la historia 1 ya muestra los datos de la cuenta.

**Independent Test**: Con una cuenta con reservas y favoritos, descargar el archivo y comprobar que contiene la cuenta, cada reserva y cada favorito, y ningún dato de otros usuarios ni la contraseña.

**Acceptance Scenarios**:

1. **Given** un usuario en «Mi cuenta», **When** pulsa «Descargar mis datos», **Then** el navegador descarga un archivo con su nombre, su correo, su rol, su fecha de alta, todas sus reservas (con libro, librería, precio, estado y fechas) y sus favoritos (con título y autor del libro).
2. **Given** el archivo descargado, **When** se revisa, **Then** no contiene la contraseña ni su resumen cifrado, ni los contadores internos de seguridad, ni datos de otros usuarios.
3. **Given** un usuario sin reservas ni favoritos, **When** descarga sus datos, **Then** el archivo contiene su cuenta y listas vacías de reservas y favoritos.

---

### Edge Cases

- El usuario cambia su nombre por el mismo que ya tenía: se acepta, se confirma y no se genera una entrada de auditoría vacía.
- El usuario escribe espacios al principio o al final del nombre: se recortan antes de validar y guardar.
- La nueva contraseña es igual a la actual: se rechaza con un mensaje que pide una distinta.
- Se falla la contraseña actual varias veces seguidas al cambiarla o al borrar la cuenta: no bloquea la cuenta (el bloqueo es solo del inicio de sesión), pero los intentos están limitados por conexión, como el inicio de sesión y el registro.
- Dos administradores activos intentan borrar sus cuentas a la vez: como mucho uno lo consigue y siempre queda al menos un administrador activo.
- Un administrador que no es el último borra su cuenta: se borra como la de cualquier usuario; los cambios que hizo siguen en la auditoría, pero el autor aparece como «Cuenta eliminada».
- Una reserva activa del usuario caduca mientras se está borrando la cuenta: queda caducada o cancelada, nunca las dos cosas, y la unidad se libera una sola vez.
- Una cuenta desactivada por un administrador no puede iniciar sesión y, por tanto, no puede usar «Mi cuenta»; para borrarla tiene que pedirlo por correo, como indica la política.
- La sesión caduca mientras el usuario está en «Mi cuenta»: al guardar se le lleva a iniciar sesión, sin perder el aviso de lo que pasó.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: El sistema MUST ofrecer una página «Mi cuenta» solo para personas con sesión iniciada, de cualquier rol. A un visitante MUST llevarle a iniciar sesión y devolverle a «Mi cuenta» después.
- **FR-002**: El enlace «Mi cuenta» MUST estar en el menú de usuario de la cabecera y en el menú lateral, para usuarios y administradores.
- **FR-003**: Toda operación de «Mi cuenta» MUST actuar solo sobre la cuenta de la sesión. MUST NOT poder indicarse otra cuenta.

**Ver y rectificar**

- **FR-004**: La página MUST mostrar el nombre, el correo, el rol y la fecha de alta de la cuenta.
- **FR-005**: El usuario MUST poder cambiar su nombre, con las mismas reglas que en el registro: obligatorio, de 1 a 100 caracteres, recortando los espacios de los extremos.
- **FR-006**: Tras cambiar el nombre, la cabecera y los menús MUST mostrar el nuevo nombre sin volver a iniciar sesión.
- **FR-007**: El correo electrónico MUST mostrarse pero no poder cambiarse desde «Mi cuenta».

**Contraseña**

- **FR-008**: Para cambiar la contraseña, el usuario MUST indicar la actual, la nueva y su repetición.
- **FR-009**: La nueva contraseña MUST cumplir la política del registro (al menos 8 caracteres, con letras y números) y mostrar el mismo mensaje si no la cumple. MUST ser distinta de la actual.
- **FR-010**: Si la contraseña actual no es correcta, el cambio MUST rechazarse con un mensaje específico.
- **FR-011**: Tras cambiar la contraseña, la sesión desde la que se cambió MUST seguir abierta y cualquier otra sesión de esa cuenta MUST dejar de valer.

**Borrado**

- **FR-012**: El usuario MUST poder borrar su cuenta de forma definitiva, confirmándolo con su contraseña actual. Antes de confirmar, MUST ver las consecuencias: se cancelan sus reservas activas, se borran sus favoritos y no se puede deshacer.
- **FR-013**: Al borrar la cuenta, sus reservas activas (pendientes o listas para recoger) MUST cancelarse con el motivo «cuenta eliminada» y liberar sus unidades, como en el resto de cancelaciones de la feature 001.
- **FR-014**: Al borrar la cuenta, sus favoritos MUST borrarse.
- **FR-015**: Al borrar la cuenta, sus datos personales (nombre, correo y contraseña cifrada) MUST eliminarse. El correo MUST quedar libre para registrar una cuenta nueva.
- **FR-016**: Las reservas ya cerradas (recogidas, canceladas o caducadas) de la cuenta MUST conservarse para el historial de las librerías, pero sin ningún dato que identifique a la persona; donde se mostraba el usuario MUST mostrarse «Cuenta eliminada».
- **FR-017**: Las entradas de auditoría que mencionan la cuenta, como autora o como afectada, MUST conservarse sin su nombre ni su correo. Donde se mostraban, MUST mostrarse «Cuenta eliminada».
- **FR-018**: Tras borrar la cuenta, la sesión MUST cerrarse, el usuario MUST volver a la portada con un mensaje de confirmación y ninguna sesión de esa cuenta MUST seguir valiendo.
- **FR-019**: Un administrador MUST NOT poder borrar su cuenta si es el último administrador activo; MUST ver un mensaje que lo explique. Esta regla MUST cumplirse aunque varios administradores lo intenten a la vez.
- **FR-020**: El borrado MUST ser todo o nada: si falla un paso, ninguna reserva, favorito ni dato de la cuenta MUST quedar modificado.

**Descarga de datos**

- **FR-021**: El usuario MUST poder descargar sus datos en un archivo estructurado y legible (JSON) con: su cuenta (nombre, correo, rol y fecha de alta), todas sus reservas (libro, librería, dirección, precio, estado, motivo de cancelación y fechas) y sus favoritos (título, autor e ISBN del libro), además de la fecha de la descarga.
- **FR-022**: El archivo MUST NOT incluir la contraseña ni su resumen cifrado, los contadores de seguridad (intentos fallidos y bloqueo) ni datos de otros usuarios.

**Seguridad y auditoría**

- **FR-023**: Los cambios de nombre y de contraseña y el borrado de la cuenta MUST generar una entrada de auditoría con el autor, la acción, la cuenta y la fecha. Las entradas MUST NOT contener la contraseña ni su resumen cifrado; en el cambio de contraseña MUST constar solo que se cambió.
- **FR-024**: Las operaciones que piden la contraseña actual (cambiarla y borrar la cuenta) MUST limitarse por conexión igual que el inicio de sesión y el registro. Fallar la contraseña en ellas MUST NOT bloquear la cuenta.
- **FR-025**: Los mensajes y textos de la página MUST estar en español, y la página MUST ser accesible con teclado y lector de pantalla y usable a 360 px de ancho, como el resto de Bookia.

### Key Entities *(include if feature involves data)*

- **Cuenta (usuario)**: la de la feature 001. Añade la información necesaria para invalidar las sesiones anteriores a un cambio de contraseña. Al borrarse desaparece por completo.
- **Reserva**: la de la feature 001. Añade el motivo de cancelación «cuenta eliminada». Las de una cuenta borrada se conservan sin datos que identifiquen a la persona.
- **Favorito**: el de la feature 001. Los de una cuenta borrada se eliminan.
- **Entrada de auditoría**: la de la feature 001. Registra también los cambios de nombre y contraseña y el borrado de la cuenta. Las que mencionan una cuenta borrada pierden su nombre y su correo.
- **Exportación de datos**: archivo que se genera al descargar, con la cuenta, sus reservas y sus favoritos. No se guarda en el sistema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario encuentra «Mi cuenta» y cambia su nombre en menos de 1 minuto, sin ayuda.
- **SC-002**: Un usuario cambia su contraseña en menos de 1 minuto, y desde ese momento la anterior no permite entrar en el 100 % de los intentos.
- **SC-003**: Tras borrar una cuenta, una búsqueda de su nombre o su correo en todos los datos de Bookia no devuelve ningún resultado.
- **SC-004**: Tras borrar una cuenta con reservas activas, el 100 % de esas unidades vuelve a estar disponible de inmediato.
- **SC-005**: Ningún intento, ni simultáneo, deja Bookia sin administradores activos.
- **SC-006**: El archivo descargado contiene el 100 % de las reservas y favoritos de la cuenta y ningún dato de otras.
- **SC-007**: Cada cambio de nombre, cambio de contraseña y borrado de cuenta tiene exactamente una entrada de auditoría.

## Assumptions

- Cambiar el correo, recuperar la contraseña olvidada y enviar correos quedan fuera de alcance, como pide la descripción. Sin envío de correos, el borrado no se confirma por correo: basta con la contraseña.
- El borrado es inmediato y definitivo, sin periodo de gracia ni papelera.
- Las reservas cerradas de una cuenta borrada se conservan sin datos personales porque forman parte del historial de las librerías (qué libros se recogieron y cuándo); la persona ya no es identificable.
- Las entradas de auditoría se conservan, sin nombre ni correo, porque la constitución exige auditar los cambios de datos; el identificador interno de la cuenta borrada no permite identificar a nadie, porque la cuenta ya no existe.
- El administrador puede borrar su propia cuenta desde «Mi cuenta» mientras no sea el último activo; la gestión de cuentas ajenas sigue siendo la de la feature 001 (desactivar y reactivar), sin borrado.
- Fallar la contraseña al cambiarla o al borrar la cuenta no cuenta para el bloqueo de 5 intentos, que protege el inicio de sesión; aquí ya hay una sesión válida y el límite por conexión basta.
- La política de privacidad se actualiza para indicar que estos derechos se pueden ejercer desde «Mi cuenta», además de por correo.
- Se reutilizan la sesión, los roles, la política de contraseñas, la auditoría y la cancelación de reservas de la feature 001.
