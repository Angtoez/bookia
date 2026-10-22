# Bookia

Aplicación web para consultar libros y saber en qué puntos de venta están disponibles. Este repositorio contiene, por ahora, la **API REST** (Node.js + Express 5 + Mongoose 8 sobre MongoDB Atlas). La SPA en React llegará en una fase posterior.

- Constitución del proyecto: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
- Especificación, modelo de datos y contrato: [`specs/001-book-catalog-stores/`](specs/001-book-catalog-stores/)

## Estado de la implementación

| Parte | Estado |
|-------|--------|
| Conexión única a MongoDB, configuración con `dotenv` y validación | ✅ |
| Modelos `users`, `genres`, `books`, `stores`, `store_books` y `audit_logs` con validaciones e índices | ✅ |
| Inicio y cierre de sesión (JWT en cookie `httpOnly`, `secure`, `sameSite: 'strict'`) y control por roles | ✅ |
| Catálogo público: listado, búsqueda por título o autor, filtro por género y detalle con tiendas | ✅ |
| CRUD de libros, de puntos de venta y de su inventario (solo administradores, auditado) | ✅ |
| Seeds idempotentes (`seed` y `seed:demo`) | ✅ |
| Registro de cuentas y bloqueo 15 min tras 5 fallos seguidos (US4, backend) | ✅ |
| Reservas sin sobrerreserva, gestión por el administrador, caducidad automática y cancelación en cascada (US5, backend) | ✅ |
| Favoritos con disponibilidad actual, e `is_favorite` en el catálogo con sesión (US6, backend) | ✅ |
| Usuarios y consulta de la auditoría (US7) | ⏳ pendiente |
| Frontend React | ⏳ pendiente |

## Modelo de datos

Colecciones independientes relacionadas por referencias (`ObjectId`) de Mongoose. Los campos van en `snake_case` y los importes, en céntimos enteros.

```text
genres 1───* books 1───* store_books *───1 stores
users 1───* reservations (libro + tienda, con copia de título, tienda y precio)
users *───* books, a través de favorites
users ── audit_logs (quién hizo cada alta, cambio o baja)
```

- **`books`**: título, autor, ISBN único (ISBN-10 o ISBN-13 válido), precio de referencia, `genre_id` → `genres`, y descripción, editorial y año opcionales. Autor y editorial son texto dentro del libro, como fija la spec.
- **`stores`**: los puntos de venta (nombre, dirección, horario y teléfono opcional).
- **`store_books`**: la relación N:M entre libros y tiendas, con el stock y un precio propio opcional.
- **`reservations`**: una unidad de un libro en una tienda, con estado (`pending` → `ready` → `picked_up`, o `cancelled` / `expired`) y copia del título, la tienda y el precio al reservar.
- **`favorites`**: los libros que cada usuario marca como favoritos; se borran al borrar el libro.
- El detalle completo está en [`data-model.md`](specs/001-book-catalog-stores/data-model.md).

## Requisitos

- Node.js 24 LTS y npm 11.
- Un clúster de MongoDB Atlas. Cualquiera sirve, incluido el gratuito M0: todos son *replica set*, que es lo que necesitan las transacciones.

> **Aviso sobre OneDrive**: si el proyecto está en una carpeta sincronizada, `node_modules/` (que incluye un binario de MongoDB de varios cientos de MB para las pruebas) hace la instalación muy lenta. Conviene excluir esa carpeta de la sincronización o mover el proyecto fuera de OneDrive.

## 1. Configurar MongoDB Atlas

1. En [cloud.mongodb.com](https://cloud.mongodb.com), crea un proyecto y un clúster (el M0 gratuito es suficiente).
2. **Database Access** → *Add New Database User*: crea un usuario con contraseña y el rol *Read and write to any database*. Si quieres restringirlo más, dale `readWrite` solo sobre la base de datos `bookia`.
3. **Network Access** → *Add IP Address*: añade tu IP actual. Evita `0.0.0.0/0` salvo para pruebas puntuales.
4. **Connect → Drivers**: copia la cadena `mongodb+srv://…`.

No hace falta crear a mano las colecciones ni los índices: los crea `npm run seed`.

## 2. Variables de entorno

```powershell
Copy-Item backend/.env.example backend/.env
```

Edita `backend/.env` (está en `.gitignore`, así que nunca se sube):

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `MONGODB_URI` | sí | Cadena de Atlas con tu usuario y contraseña. Los caracteres especiales de la contraseña van codificados en URL (`@` → `%40`). |
| `MONGODB_DB_NAME` | no | Base de datos dentro del clúster (por defecto `bookia`). |
| `JWT_SECRET` | sí | Al menos 32 caracteres aleatorios: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `BCRYPT_ROUNDS` | no | Por defecto 12; mínimo 10. |
| `PORT` | no | Por defecto 3000. |
| `CURRENCY` | no | `MXN` en el ejemplo. |
| `CORS_ORIGIN` | no | Solo si un frontend en otro origen llama a la API. |
| `MAX_ACTIVE_RESERVATIONS` | no | Reservas activas por usuario (por defecto 5). |
| `PENDING_TTL_DAYS`, `PICKUP_TTL_DAYS` | no | Días hasta que caduca una reserva pendiente (7) o lista para recoger (3). |
| `EXPIRATION_INTERVAL_MS` | no | Cada cuánto revisa el job las reservas vencidas (por defecto 60 000). |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | para el seed | Administrador inicial. La contraseña debe tener al menos 8 caracteres, con letras y números. |

Si falta una variable obligatoria o no es válida, la API no arranca e indica cuál es.

## 3. Instalar y ejecutar

Todos los comandos se ejecutan desde `bookia/`:

```powershell
npm install          # dependencias del monorepo (workspace backend)
npm run db:check     # comprueba la conexión, el replica set y las transacciones (no escribe nada)
npm run seed         # crea colecciones e índices, los 20 géneros y el administrador inicial
npm run seed:demo    # opcional: libros de ejemplo y 4 tiendas ficticias en Huauchinango, Puebla
npm run dev          # API en http://localhost:3000/api con recarga automática
```

Los dos *seeds* son idempotentes: puedes ejecutarlos varias veces. Solo insertan lo que falta (géneros por `slug`, libros por ISBN, tiendas por nombre y asociaciones por tienda y libro) y nunca sobrescriben datos editados. `seed:demo` se niega a ejecutarse con `NODE_ENV=production`. Las tiendas de demostración son ficticias (llevan "(demo)" en el nombre y tienen direcciones de ejemplo) y los ISBN son de ejemplo.

## 4. Calidad

```powershell
npm run lint         # ESLint + Prettier, sin advertencias
npm test             # Vitest + Supertest contra un replica set de MongoDB en memoria, con cobertura ≥ 70 %
npm run licenses     # licencias de las dependencias según la constitución
```

Las pruebas **no usan Atlas**: levantan un MongoDB temporal en memoria (`mongodb-memory-server`). La primera ejecución descarga su binario.

## 5. Probar la API a mano

Los ejemplos usan `curl.exe` (incluido en Windows 11). Guardan la cookie de sesión en `cookies.txt`; curl la envía también a `http://localhost` aunque sea `secure`. En PowerShell, `curl` a secas es un alias de `Invoke-WebRequest`; usa `curl.exe`.

Como PowerShell trata las comillas de forma especial, lo más cómodo es escribir cada cuerpo JSON en un archivo y pasarlo con `-d "@archivo.json"`.

### Consultas públicas (sin sesión)

```powershell
curl.exe "http://localhost:3000/api/genres"
curl.exe "http://localhost:3000/api/books"                       # listado paginado (20 por página)
curl.exe "http://localhost:3000/api/books?q=cien%20anos"          # por título, sin tildes ni mayúsculas
curl.exe "http://localhost:3000/api/books?q=rulfo"                # por autor
curl.exe "http://localhost:3000/api/books?genre=novela&page=2"    # por género (slug) y página
curl.exe "http://localhost:3000/api/books?genre=novela&q=pedro"   # género + búsqueda
curl.exe "http://localhost:3000/api/books/<id>"                   # detalle con tiendas, precio y unidades
```

### Iniciar sesión como administrador

`login.json`:

```json
{ "email": "admin@ejemplo.com", "password": "TuClave123" }
```

```powershell
curl.exe -c cookies.txt -H "Content-Type: application/json" -d "@login.json" http://localhost:3000/api/auth/login
curl.exe -b cookies.txt http://localhost:3000/api/auth/me
```

### CRUD de libros (administrador)

`book.json` (el `genre_id` sale de `GET /api/genres`; el precio va en céntimos):

```json
{
  "title": "Aura",
  "author": "Carlos Fuentes",
  "genre_id": "<id del género>",
  "isbn": "978-84-376-0494-7",
  "price_cents": 19900,
  "publisher": "Ejemplo",
  "publication_year": 1962
}
```

```powershell
curl.exe -b cookies.txt -H "Content-Type: application/json" -d "@book.json" http://localhost:3000/api/books                # crear → 201
curl.exe -b cookies.txt -X PATCH -H "Content-Type: application/json" -d "@cambios.json" http://localhost:3000/api/books/<id> # editar → 200
curl.exe -b cookies.txt http://localhost:3000/api/books/<id>/deletionImpact                                                # qué se verá afectado
curl.exe -b cookies.txt -X DELETE http://localhost:3000/api/books/<id>                                                     # borrar → 204
```

`cambios.json` puede tener solo los campos que cambian, por ejemplo `{ "price_cents": 17900 }`.

### CRUD de puntos de venta e inventario (administrador)

`store.json`:

```json
{
  "name": "Mi librería",
  "address": "Calle de ejemplo 10, Huauchinango, Puebla",
  "opening_hours": "L–V 9:00–19:00",
  "phone": "776 000 0010"
}
```

```powershell
curl.exe -b cookies.txt http://localhost:3000/api/stores                                                                    # listar
curl.exe -b cookies.txt -H "Content-Type: application/json" -d "@store.json" http://localhost:3000/api/stores               # crear → 201
curl.exe -b cookies.txt http://localhost:3000/api/stores/<id>                                                               # consultar
curl.exe -b cookies.txt -X PATCH -H "Content-Type: application/json" -d "@cambios.json" http://localhost:3000/api/stores/<id> # editar
curl.exe -b cookies.txt -X DELETE http://localhost:3000/api/stores/<id>                                                     # borrar (quita sus asociaciones; los libros siguen)
```

Inventario de una tienda (`asociar.json` = `{ "book_id": "<id libro>", "stock": 5, "store_price_cents": 18500 }`):

```powershell
curl.exe -b cookies.txt -H "Content-Type: application/json" -d "@asociar.json" http://localhost:3000/api/stores/<id>/books     # asociar → 201
curl.exe -b cookies.txt http://localhost:3000/api/stores/<id>/books                                                          # listar inventario
curl.exe -b cookies.txt -X PATCH -H "Content-Type: application/json" -d "@stock.json" http://localhost:3000/api/stores/<id>/books/<bookId>
curl.exe -b cookies.txt -X DELETE http://localhost:3000/api/stores/<id>/books/<bookId>                                       # desasociar → 204
```

`stock.json` = `{ "stock": 8 }`. Con `{ "store_price_cents": null }` se quita el precio propio y se vuelve al de referencia.

### Crear una cuenta

`registro.json` = `{ "name": "Ana", "email": "ana@example.com", "password": "lectora2024" }`. La cuenta se crea siempre con rol `user` y queda con la sesión iniciada. Tras 5 contraseñas erróneas seguidas, la cuenta se bloquea 15 minutos.

```powershell
curl.exe -c usuario.txt -H "Content-Type: application/json" -d "@registro.json" http://localhost:3000/api/auth/register   # → 201
```

### Reservas

Con la sesión de un usuario (`reserva.json` = `{ "book_id": "<id libro>", "store_id": "<id tienda>" }`):

```powershell
curl.exe -b usuario.txt -H "Content-Type: application/json" -d "@reserva.json" http://localhost:3000/api/reservations   # reservar → 201
curl.exe -b usuario.txt http://localhost:3000/api/reservations/mine                                                     # mis reservas
curl.exe -b usuario.txt -X POST http://localhost:3000/api/reservations/<id>/cancel                                      # cancelar
```

Con la sesión del administrador:

```powershell
curl.exe -b cookies.txt "http://localhost:3000/api/reservations?status=pending&store_id=<id tienda>"   # listar y filtrar
curl.exe -b cookies.txt -X POST http://localhost:3000/api/reservations/<id>/ready                       # lista para recoger (3 días)
curl.exe -b cookies.txt -X POST http://localhost:3000/api/reservations/<id>/pickup                      # recogida: descuenta el stock
```

Las reservas que vencen pasan solas a `expired` y liberan la unidad. Borrar un libro o una tienda cancela sus reservas activas.

### Favoritos

Con la sesión de un usuario:

```powershell
curl.exe -b usuario.txt -X PUT http://localhost:3000/api/favorites/<id libro>      # marcar → 204 (idempotente)
curl.exe -b usuario.txt http://localhost:3000/api/favorites                         # mis favoritos, con stores_available
curl.exe -b usuario.txt -X DELETE http://localhost:3000/api/favorites/<id libro>   # desmarcar → 204
```

Con sesión, `GET /api/books` y `GET /api/books/<id>` añaden `is_favorite` a cada libro.

### Errores

Todos los errores siguen el formato `{"error": {"code", "message", "details?"}}`: `400 VALIDATION_ERROR` (con `details` por campo), `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND` y `409` (`EMAIL_TAKEN`, `ISBN_TAKEN`, `ALREADY_ASSOCIATED`, `STOCK_BELOW_RESERVED`, `HAS_ACTIVE_RESERVATIONS`, `OUT_OF_STOCK`, `DUPLICATE_RESERVATION`, `RESERVATION_LIMIT` o `INVALID_TRANSITION`). El contrato completo está en [`contracts/rest-api.md`](specs/001-book-catalog-stores/contracts/rest-api.md).

## Estructura

```text
bookia/
├── package.json            # workspaces y scripts
├── eslint.config.js, .prettierrc
├── scripts/checkLicenses.js
└── backend/
    ├── .env.example
    ├── src/
    │   ├── app.js, server.js
    │   ├── config/         # env.js (dotenv + zod), db.js (conexión única)
    │   ├── models/         # User, Genre, Book, Store, StoreBook, Reservation, Favorite, AuditLog
    │   ├── controllers/    # auth, config, books, adminBooks, stores, storeBooks, reservations, favorites
    │   ├── routes/         # un router por recurso, montados en /api
    │   ├── middlewares/    # authenticate, requireRole, validate, rateLimit, errorHandler, notFound
    │   ├── services/       # transaction, auditService, cascadeService, reservationService, reservationTransitions
    │   ├── jobs/           # expireReservations (caducidad periódica)
    │   ├── validators/     # esquemas zod
    │   ├── utils/          # isbn, búsqueda, paginación, cookie de sesión, presenters
    │   └── scripts/        # seed, seedDemo, checkDb
    └── tests/              # unit/ (con mocks) e integration/ (Supertest + MongoMemoryReplSet)
```
