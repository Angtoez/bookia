# Quickstart: validar Mi cuenta

Se parte de la instalación de la [feature 001](../001-book-catalog-stores/quickstart.md): replica set de MongoDB, `backend/.env`, `npm install`, `npm run seed` y `npm run seed:demo`.

## Pruebas automáticas

```bash
npm run lint
npm test
```

Además de las pruebas de la 001, deben pasar:

- `backend/tests/integration/account.test.js`: ver, cambiar el nombre, cambiar la contraseña (la sesión antigua devuelve `401` y la nueva funciona) y exportar (sin `password_hash` ni campos de seguridad).
- `backend/tests/integration/account.delete.test.js`:
  - cascada: reservas canceladas con `account_deleted`, unidades liberadas y favoritos borrados;
  - búsqueda del nombre y el correo en todas las colecciones sin resultados (SC-003);
  - `LAST_ADMIN`;
  - dos administradores borrándose a la vez, tras lo cual queda uno (SC-005).
- `backend/tests/integration/authorization.test.js`, con las rutas `/account*`: el anónimo recibe `401`.
- Las pruebas unitarias de `accountController` y de la versión de sesión.
- Las pruebas del frontend de `MyAccountPage` y sus formularios.

## Recorrido manual

Con `npm run dev`, en http://localhost:5173, con una cuenta de usuario de prueba que tenga una reserva activa y un favorito:

1. **Ver y cambiar el nombre**: menú de usuario › Mi cuenta. Se ven el nombre, el correo, el rol y la fecha de alta. Cambia el nombre: la cabecera muestra el nuevo al momento. En Auditoría (como administrador) aparece una entrada `update` de la cuenta.
2. **Cambiar la contraseña**:
   - Con la contraseña actual mal escrita, el mensaje sale junto al campo.
   - Con una contraseña nueva sin números, sale el mensaje de la política.
   - Con datos correctos, sale la confirmación y sigues dentro.
   - Cierra sesión: la antigua ya no sirve y la nueva sí.
3. **Sesión en otro navegador**: inicia sesión con la misma cuenta en otro navegador, o en una ventana privada, y cambia la contraseña en el primero. En el segundo, la siguiente acción lleva a iniciar sesión.
4. **Descargar los datos**: «Descargar mis datos» baja `bookia-mis-datos-AAAA-MM-DD.json`, con la cuenta, la reserva y el favorito, y sin la contraseña.
5. **Borrar la cuenta**:
   - «Borrar mi cuenta» explica las consecuencias.
   - Con la contraseña mal escrita, la cuenta sigue.
   - Con la buena, vuelves a la portada con el aviso.
   - En la ficha del libro reservado, la unidad vuelve a estar disponible.
   - Iniciar sesión con esa cuenta da el mensaje genérico.
   - Como administrador:
     - en Reservas, la reserva aparece cancelada («cuenta eliminada») y con «Cuenta eliminada» como usuario;
     - en Auditoría, ninguna entrada muestra el nombre ni el correo.
6. **Último administrador**: con un solo administrador activo, intentar borrar su cuenta muestra «No puedes borrar tu cuenta: eres el último administrador activo».
