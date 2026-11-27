# Validación manual (T135)

Recorrido de los 8 escenarios de [`quickstart.md`](../quickstart.md) § Escenarios de validación manual, en la SPA (`npm run dev`, http://localhost:5173) con los datos de `npm run seed:demo`. Marca cada punto y anota en «Diferencias» lo que no coincida con lo esperado.

Se necesitan dos cuentas: el **administrador** del seed (`ADMIN_EMAIL` de `backend/.env`) y un **usuario** normal, que se crea en el escenario 4. Los enlaces de la navegación están en el menú lateral (botón ☰ de la cabecera); la búsqueda, en la lupa.

Los importes están en la moneda de `GET /api/config` (MXN con el `.env` de ejemplo), así que el «18,50 €» del escenario 3 es aquí «18,50 MXN».

## 1. Catálogo público (historia 1)

Comprobado el 24/10/2026 contra la API y la SPA, sin sesión.

- [x] Sin sesión, el catálogo muestra 20 libros por página (194 libros, 10 páginas). En la portada están en «Todos los libros», debajo de las secciones destacadas.
- [x] La lupa con `cien anos` encuentra «Cien años de soledad».
- [x] Género y búsqueda a la vez: con Novela (menú ☰ › Géneros) y `pedro` solo aparece «Pedro Páramo»; sin género, `pedro` da 2 resultados.
- [x] El detalle de «Cien años de soledad» muestra cada tienda con su precio y sus unidades («Quedan 5», «Quedan 2») y la Librería del Mercado como «Agotado».
- [x] «Los de abajo», sin tiendas, muestra «Este libro no está disponible en ningún establecimiento».

## 2. Gestión de libros (historia 2)

Como **administrador**, en ☰ › Administración › Libros.

- [ ] Crea un libro (por ejemplo, con el ISBN `978-84-376-0494-7`).
- [ ] Créalo otra vez con el mismo ISBN: el formulario muestra el error de ISBN repetido (`409 ISBN_TAKEN`).
- [ ] Edítalo y bórralo: en ☰ › Auditoría hay 3 entradas de ese libro (alta, cambio y baja).
- [ ] Como **usuario**, `POST /api/books` responde `403` (también lo cubre `tests/integration/authorization.test.js`).

## 3. Tiendas e inventario (historia 3)

Como **administrador**, en ☰ › Administración › Establecimientos.

- [ ] Crea una tienda.
- [ ] En su inventario, asocia un libro con stock 3 y precio 18,50: la ficha pública del libro muestra la tienda con «Quedan 3» y 18,50 MXN.
- [ ] Asócialo otra vez a la misma tienda: aparece el error de libro ya asociado (`409 ALREADY_ASSOCIATED`).

## 4. Registro e inicio de sesión (historia 4)

- [ ] Sin sesión, crea una cuenta (☰ › Crear cuenta) y cierra sesión (☰ › Cerrar sesión).
- [ ] Haz 5 intentos de entrar con una contraseña incorrecta: el 6.º, aunque la contraseña sea la buena, muestra el mismo mensaje genérico hasta pasados 15 minutos.

Después de los 15 minutos, esta cuenta es el **usuario** del resto de escenarios.

## 5. Reservas (historia 5)

- [ ] Como **usuario**, reserva el libro del escenario 3 en tu tienda: en la ficha las unidades bajan de 3 a 2.
- [ ] Como **administrador**, bajar el stock de esa asociación a 0 da el error de stock por debajo de lo reservado (`409 STOCK_BELOW_RESERVED`).
- [ ] El administrador marca la reserva como lista (☰ › Reservas): en «Mis reservas» del usuario aparece la fecha límite de recogida.
- [ ] El administrador la marca como recogida: el stock de la tienda pasa a 2.
- [ ] Con 5 reservas activas, una 6.ª da el error de límite de reservas (`409 RESERVATION_LIMIT`).

## 6. Caducidad

- [ ] Para la API, pon en `backend/.env` `PICKUP_TTL_DAYS=0` y `EXPIRATION_INTERVAL_MS=5000`, y vuelve a lanzar `npm run dev`.
- [ ] Marca una reserva como lista: en menos de 10 s pasa a «caducada» y la unidad vuelve a estar disponible en la ficha.
- [ ] Deja `backend/.env` como estaba y reinicia.

## 7. Favoritos (historia 6)

- [ ] Como **usuario**, marca 2 libros con el corazón, cierra sesión y vuelve a entrar: siguen en ☰ › Mis favoritos.
- [ ] Si el **administrador** borra uno de esos libros, desaparece de la lista.

## 8. Usuarios y auditoría (historia 7)

Como **administrador**, en ☰ › Administración › Usuarios.

- [ ] Promueve un usuario a administrador.
- [ ] Desactiva una cuenta con una reserva activa: en ☰ › Reservas, esa reserva aparece como «cancelada (cuenta desactivada)».
- [ ] Intentar desactivar al último administrador activo da el error `409 LAST_ADMIN`.

## Diferencias

Anota aquí cada punto que no coincida con lo esperado: escenario, qué hiciste, qué esperabas y qué pasó.

- Ninguna por ahora (escenario 1).
