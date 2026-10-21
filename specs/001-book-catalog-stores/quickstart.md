# Quickstart: validación de Bookia (feature 001)

Esta guía sirve para arrancar Bookia en local y comprobar de punta a punta que la feature cumple la spec. No contiene el código: el detalle está en [contracts/rest-api.md](./contracts/rest-api.md), [contracts/ui-routes.md](./contracts/ui-routes.md) y [data-model.md](./data-model.md).

## Requisitos previos

- Node.js 24 LTS y npm.
- MongoDB como *replica set*, necesario para las transacciones ([research R8](./research.md#r8-reservas-sin-sobrerreserva-fr-022b-sc-009)). Puede ser cualquiera de estas dos opciones:
  - Docker: `docker run -d --name bookia-mongo -p 27017:27017 mongo:8 --replSet rs0`, y luego `docker exec bookia-mongo mongosh --eval "rs.initiate()"`.
  - Un clúster gratuito de MongoDB Atlas.

## Configuración

Copia `backend/.env.example` a `backend/.env` y rellena los valores. Ninguna credencial va en el código (principio II).

| Variable | Ejemplo |
|----------|---------|
| `MONGODB_URI` | `mongodb://localhost:27017/bookia?replicaSet=rs0` |
| `JWT_SECRET` | cadena aleatoria de al menos 32 caracteres |
| `BCRYPT_ROUNDS` | `12` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `http://localhost:5173` (solo si la SPA no usa el proxy) |
| `CURRENCY` | `EUR` |
| `MAX_ACTIVE_RESERVATIONS`, `PENDING_TTL_DAYS`, `PICKUP_TTL_DAYS`, `EXPIRATION_INTERVAL_MS` | `5`, `7`, `3`, `60000` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | datos del administrador inicial que crea el *seed* |

## Arranque

Desde `bookia/`:

```powershell
npm install            # instala los workspaces backend y frontend
npm run seed           # crea los géneros, el administrador inicial y los índices
npm run dev            # API en :3000 y SPA en :5173, con proxy /api → :3000
```

Abre `http://localhost:5173`.

## Puertas de calidad

Deben pasar antes de dar por buena cualquier tarea, en este orden:

```powershell
npm run lint           # ESLint + Prettier --check sin advertencias
npm test               # Vitest en backend y frontend, con cobertura ≥ 70 %
npm run licenses       # lista las licencias de las dependencias directas (solo MIT/Apache-2.0, salvo dotenv)
```

## Escenarios de validación manual

Cada escenario remite a la spec. Si una respuesta difiere de lo esperado, es un fallo.

1. **Catálogo público (historia 1)**
   - Sin sesión, `/` muestra 20 libros por página.
   - Al buscar `cien anos` aparece "Cien años de soledad".
   - Filtrar por Novela y buscar a la vez aplica los dos criterios.
   - El detalle muestra cada tienda con su precio y sus unidades, o "Agotado".
   - Un libro sin tiendas muestra el aviso de que no está disponible.
2. **Gestión de libros (historia 2)**
   - Como administrador, crea un libro.
   - Créalo otra vez con el mismo ISBN: la API responde `409 ISBN_TAKEN`.
   - Edítalo y bórralo: hay 3 entradas en `/admin/audit`.
   - Como usuario normal, `POST /api/books` responde `403`.
3. **Tiendas e inventario (historia 3)**
   - Crea una tienda.
   - Asocia un libro con stock 3 y precio 18,50 €: el detalle público lo muestra.
   - Asócialo otra vez a la misma tienda: la API responde `409 ALREADY_ASSOCIATED`.
4. **Registro e inicio de sesión (historia 4)**
   - Regístrate y cierra sesión.
   - Haz 5 intentos fallidos: el 6.º, aunque la contraseña sea correcta, devuelve el mismo mensaje genérico hasta pasados 15 minutos.
5. **Reservas (historia 5)**
   - Como usuario, reserva el libro del paso 3: las unidades disponibles bajan de 3 a 2.
   - Bajar el stock a 0 desde la administración da `409 STOCK_BELOW_RESERVED`.
   - El administrador marca la reserva como lista: "Mis reservas" muestra la fecha límite.
   - El administrador la marca como recogida: el stock pasa a 2.
   - Una 6.ª reserva activa da `409 RESERVATION_LIMIT`.
6. **Caducidad**: con `PICKUP_TTL_DAYS=0` y `EXPIRATION_INTERVAL_MS=5000`, una reserva lista pasa a "caducada" en menos de 10 s y libera su unidad.
7. **Favoritos (historia 6)**
   - Marca 2 favoritos, cierra sesión, vuelve a entrar y siguen ahí.
   - Si el administrador borra uno de esos libros, desaparece de la lista.
8. **Usuarios y auditoría (historia 7)**
   - Promueve un usuario a administrador.
   - Desactiva una cuenta con una reserva activa: la reserva pasa a "cancelada (cuenta desactivada)".
   - Intentar desactivar al último administrador da `409 LAST_ADMIN`.

## Pruebas automáticas clave

Deben existir y estar en verde:

| Prueba | Tipo | Verifica |
|--------|------|----------|
| Concurrencia de la última unidad: 20 `POST /reservations` en paralelo sobre `stock = 1` | Integración (`MongoMemoryReplSet`) | Exactamente 1 `201` y 19 `409 OUT_OF_STOCK` (SC-009) |
| Cascada de borrado de un libro y de una tienda | Integración | Reservas canceladas, contadores liberados y auditoría escrita (FR-022f, SC-005) |
| Ninguna ruta de gestión es accesible para `user` ni para anónimos | Integración (tabla de rutas × roles) | Siempre `401` o `403` (SC-006) |
| Búsqueda sin tildes y con caracteres especiales de regex (`.*(`) | Integración | Coincidencia literal, sin errores |
| Job de caducidad ejecutado dos veces | Unitaria | Idempotente: una sola transición y una sola entrada de auditoría |
| Controladores con modelos mockeados | Unitaria | Ramas de error de cada controlador |
| `explain()` de las consultas del catálogo con 10 000 libros | Integración | `IXSCAN`, sin `COLLSCAN` (principio IV) |
