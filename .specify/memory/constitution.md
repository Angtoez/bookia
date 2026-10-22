<!--
Sync Impact Report
==================
Versión: 1.0.1 → 1.0.2
Tipo de cambio: PATCH (precisión de la regla de licencias para las transitivas; sin cambios de principios)
Principios modificados: ninguno
Secciones modificadas:
  - Cumplimiento, Licencias y Decisiones Descartadas: se admiten MIT-0, CC0-1.0 y BlueOak-1.0.0
    entre las transitivas permisivas, y se exceptúan lightningcss (MPL-2.0) y caniuse-lite
    (CC-BY-4.0), que trae el stack obligatorio del principio I. Las directas no cambian.
Motivo: `npm run licenses` ya fallaba con minimatch (BlueOak, vía ESLint) y lightningcss (vía
  Vite); el frontend añade caniuse-lite, mdn-data (CC0), @csstools/* (MIT-0) y lru-cache (BlueOak).
Secciones añadidas: ninguna
Secciones eliminadas: ninguna
Plantillas revisadas: plan-template.md, spec-template.md y tasks-template.md (sin cambios necesarios)
TODOs diferidos: ninguno
-->

# Bookia Constitution

## Core Principles

### I. Stack Tecnológico Definido

Bookia MUST construirse como una aplicación full stack con un backend Node.js que expone una
API REST mediante Express.js y un frontend React como Single Page Application, configurado con
Vite y React Router. Los estilos del frontend MUST resolverse exclusivamente con utilidades de
Tailwind CSS. Se MUST usar versiones estables y LTS de Node.js, Express.js, React y Tailwind CSS;
MUST NOT usarse características en fase Beta ni marcadas como Deprecated.

Rationale: un stack fijo y estable permite que todo el equipo del curso Full Stack I trabaje con
las mismas herramientas y evita roturas por APIs inestables.

### II. Seguridad por Defecto (NON-NEGOTIABLE)

- Autenticación MUST implementarse con JSON Web Tokens (JWT) transportados en cookies con los
  atributos `httpOnly`, `secure` y `sameSite: 'strict'`.
- Autorización MUST seguir un modelo RBAC: toda ruta protegida de Express MUST validar el rol del
  usuario mediante middlewares dedicados antes de ejecutar cualquier controlador.
- Las contraseñas MUST cifrarse con bcrypt usando al menos 10 rondas de salting. MUST NOT
  almacenarse contraseñas en texto plano.
- Credenciales, cadenas de conexión a MongoDB y llaves secretas de JWT MUST leerse
  exclusivamente desde variables de entorno con `dotenv`. MUST NOT hardcodearse credenciales.
- Los valores externos MUST sanitizarse antes de usarse en consultas de Mongoose; MUST NOT
  construirse filtros u operadores mediante interpolación de cadenas no validada.

Rationale: la aplicación maneja usuarios y datos personales; una brecha de seguridad invalida
cualquier otra cualidad del sistema.

### III. Persistencia con MongoDB y Mongoose

La base de datos MUST ser MongoDB, con un modelo orientado a documentos y referencias entre
colecciones para representar las relaciones entre libros y puntos de venta. Toda interacción con
la base de datos MUST hacerse a través de Mongoose como ODM, usando sus esquemas y validaciones
para garantizar la integridad de los documentos. MUST NOT usarse bases de datos relacionales
(MySQL, PostgreSQL u otras).

Rationale: MongoDB es la decisión de almacenamiento de Bookia desde su concepción y Mongoose
centraliza la validación de datos en los esquemas.

### IV. Rendimiento y Escalabilidad

- Los endpoints de Express MUST responder en menos de 200 ms en condiciones normales de
  operación.
- Las consultas de lectura masiva o filtrado frecuente MUST apoyarse en índices definidos en las
  colecciones, evitando recorridos completos de colección innecesarios.
- La conexión a MongoDB MUST ser un cliente único inicializado al arrancar el servidor,
  reutilizado durante todo el ciclo de vida de la aplicación y cerrado de forma controlada al
  terminar el proceso.

Rationale: tiempos de respuesta bajos y una gestión de conexiones predecible mantienen la
experiencia de usuario y evitan agotar recursos.

### V. Estándares de Código y Estructura Modular

- Nomenclatura: `camelCase` para variables, funciones y rutas de Express; `PascalCase` para
  componentes de React; `snake_case` para los campos de los esquemas de Mongoose;
  `SCREAMING_SNAKE_CASE` para constantes globales y variables de entorno.
- Idioma: los identificadores (variables, funciones, componentes y esquemas) MUST escribirse en
  inglés. Los comentarios del código, la documentación y los mensajes de commit MUST escribirse
  en español.
- El código MUST pasar sin advertencias la configuración estándar de ESLint y el formateador
  Prettier antes de cualquier integración.
- Ningún archivo MUST superar las 300 líneas de código.
- Estructura del backend: `config/` (conexión a MongoDB y variables de entorno), `controllers/`
  (lógica de negocio por recurso), `routes/` (endpoints y asignación de controladores),
  `middlewares/` (tokens, roles y manejo de errores) y `models/` (esquemas de libros,
  establecimientos y usuarios).
- Estructura del frontend: `components/` (UI reutilizable), `hooks/` (estado y efectos
  reutilizables), `pages/` (vistas principales) y `services/` (consumo de la API con fetch o
  axios).

Rationale: convenciones uniformes y archivos pequeños facilitan la revisión individual por cada
integrante del equipo.

### VI. Testing y Cobertura Mínima

- La lógica de negocio del backend y los utilitarios críticos del frontend MUST mantener al menos
  un 70 % de cobertura.
- Los controladores de Express MUST tener pruebas unitarias con mocks de las respuestas de
  MongoDB.
- Los endpoints principales de la API MUST tener pruebas de integración que verifiquen el flujo
  completo.

Rationale: las pruebas automáticas son la condición para integrar y desplegar con confianza.

### VII. Auditoría y Trazabilidad

Las operaciones críticas (registro, actualización y eliminación de libros o establecimientos)
MUST generar una entrada en la colección `audit_logs` con el identificador del usuario, la acción
ejecutada y la fecha y hora de la operación.

Rationale: la trazabilidad permite reconstruir quién cambió qué y cuándo, y apoya el cumplimiento
normativo.

## Cumplimiento, Licencias y Decisiones Descartadas

- Privacidad: el tratamiento de datos de usuarios MUST cumplir las políticas de privacidad
  aplicables; si se capturan datos personales en formularios, MUST respetarse los principios del
  GDPR y la normativa local vigente.
- Licencias: las dependencias npm directas MUST tener licencia MIT o Apache 2.0. Se exceptúa
  `dotenv` (BSD-2-Clause), exigido por el principio II. Las dependencias transitivas MUST tener
  licencias permisivas (MIT, MIT-0, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0 o
  BlueOak-1.0.0). Se exceptúan solo estas transitivas, que trae el stack obligatorio del
  principio I y no tienen sustituto:
  - `lightningcss` y sus binarios por plataforma (`lightningcss-*`, MPL-2.0), vía Vite y
    Tailwind CSS 4. Se usan sin modificar como herramienta de compilación y no se distribuyen
    en la SPA generada.
  - `caniuse-lite` (CC-BY-4.0), datos de compatibilidad de navegadores, vía browserslist.

  Cualquier otra excepción MUST aprobarse con una enmienda de esta constitución.
- Decisiones descartadas:
  - MUST NOT usarse SQL ni bases de datos relacionales.
  - MUST NOT usarse Next.js ni arquitecturas SSR; el frontend es React puro (Vite + React Router)
    acoplado a un servidor Express independiente.
  - MUST NOT usarse Bootstrap ni otros frameworks de diseño, ni estilos en línea en los atributos
    del JSX.
  - El estado global MUST resolverse con Context API o, si la complejidad lo justifica, con
    Zustand. Redux MUST NOT usarse salvo que sea estrictamente necesario y quede justificado.

## Flujo de Desarrollo y Puertas de Calidad

- La estructura del proyecto MUST permitir un pipeline de CI que ejecute linters y pruebas
  automáticas antes de autorizar cualquier despliegue a producción.
- Antes de dar una tarea por terminada, en este orden: ESLint y Prettier sin advertencias,
  pruebas en verde con la cobertura mínima cumplida, y verificación de cumplimiento de esta
  constitución.
- Las features se desarrollan con el ciclo Spec Kit (`specify` → `plan` → `tasks` →
  `implement`), con revisión tras la especificación y tras el plan.

## Governance

Esta constitución prevalece sobre cualquier otra guía o práctica del proyecto. Toda propuesta de
diseño, estructura y generación de código MUST alinearse con ella durante el periodo del curso
Full Stack I.

- Enmiendas: se proponen modificando `../reglas.md`, se documentan en el Sync Impact Report y se
  aplican con `speckit-constitution`.
- Versionado semántico: MAJOR para eliminar o redefinir principios de forma incompatible, MINOR
  para añadir principios o ampliar materialmente la guía, PATCH para aclaraciones y redacción.
- Cumplimiento: cada plan (`plan.md`) MUST incluir una verificación contra esta constitución, y
  toda revisión de código MUST comprobarla. Cualquier excepción MUST justificarse por escrito en
  el plan de la feature.
- La guía operativa de desarrollo está en `CLAUDE.md` y `../AGENTS.md`.

**Version**: 1.0.2 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-22
