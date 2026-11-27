# Contrato: rutas de la SPA (Mi cuenta)

**Feature**: `002-my-account`. Amplía las [rutas de la 001](../../001-book-catalog-stores/contracts/ui-routes.md).

| Ruta | Página | Acceso | Historia | Consume |
|------|--------|--------|----------|---------|
| `/me/account` | `MyAccountPage` | usuario o admin (`RequireAuth`) | 1 a 4 | `GET /account`, `PATCH /account`, `POST /account/password`, `GET /account/export`, `DELETE /account` |

## Estructura de la página

1. **Tus datos**: nombre (editable), correo, rol y fecha de alta. Botón «Guardar». Al guardar, se actualiza la cabecera (`setUser` de `AuthContext`).
2. **Contraseña**: contraseña actual, nueva y repetición, con los requisitos de la política marcados mientras se escribe, como en el registro. Botón «Cambiar contraseña».
3. **Tus datos personales**: explicación breve y enlace «Descargar mis datos» (`/api/account/export`, con atributo `download`), más un enlace a la política de privacidad.
4. **Borrar la cuenta**: zona separada y marcada como peligrosa, con la lista de consecuencias y el botón «Borrar mi cuenta». El botón abre un `ConfirmDialog` con el campo de contraseña. Al confirmar:
   - **si va bien**: `AuthContext` vacía la sesión y se navega a `/` con el aviso «Tu cuenta se ha borrado».
   - **si falla**: el error se muestra en el diálogo (`WRONG_PASSWORD` junto al campo, y `LAST_ADMIN` como mensaje).

## Navegación

- **`UserMenu`**: «Mi cuenta» es el primer enlace, para los dos roles.
- **Menú lateral**: la sección «Mi cuenta» muestra «Mi cuenta» a los dos roles, y además «Mis reservas» y «Mis favoritos» al usuario.
- **Pie**: la columna de la cuenta incluye «Mi cuenta».

## Comportamiento común

- Las respuestas `401` siguen la regla de la 001: se vacía la sesión y se redirige a `/login?next=/me/account`.
- Cada formulario muestra su confirmación o su error en una región `role="status"` o `role="alert"` junto al botón, no en un aviso global.
- La página se usa a 360 px de ancho y con teclado. El diálogo de borrado atrapa el foco y se cierra con Esc, como el resto de `ConfirmDialog`.
