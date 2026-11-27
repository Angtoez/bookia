// Política de privacidad (aviso de privacidad). Describe lo que Bookia hace de verdad con los
// datos: si cambia el modelo de datos, la sesión o un servicio externo, hay que revisarla.
// Cumple el requisito de privacidad de la constitución (GDPR y normativa local).
import { useEffect } from 'react';
import { Link } from 'react-router';

/**
 * Datos del responsable del tratamiento. Mientras valgan null, la página los muestra como
 * pendientes: hay que rellenarlos antes de publicar Bookia.
 */
export const PRIVACY_OWNER = {
  name: null, // Persona o empresa responsable de Bookia.
  address: null, // Domicilio completo.
  email: null, // Correo para ejercer los derechos de privacidad.
};

export const PRIVACY_UPDATED = '26 de noviembre de 2026';

function Owner({ field, label }) {
  const value = PRIVACY_OWNER[field];
  if (value) return <strong className="font-semibold text-stone-900">{value}</strong>;
  return (
    <mark className="rounded bg-amber-100 px-1 font-semibold text-amber-900">
      [Pendiente: {label}]
    </mark>
  );
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-bold text-stone-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

const LIST = 'list-disc space-y-1.5 pl-5';

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Política de privacidad · Bookia';
  }, []);

  return (
    <article className="mx-auto max-w-3xl space-y-8 rounded-xl bg-white p-6 text-stone-700 shadow-xs ring-1 ring-stone-200 sm:p-10">
      <header className="space-y-2 border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-bold text-stone-900">Política de privacidad</h1>
        <p className="text-sm text-stone-500">Última actualización: {PRIVACY_UPDATED}</p>
        <p>
          En esta página te explicamos qué datos personales trata Bookia, para qué y qué derechos
          tienes. Solo pedimos los datos mínimos para que puedas reservar libros y guardar tus
          favoritos.
        </p>
      </header>

      <Section id="responsable" title="1. Quién es el responsable">
        <p>
          El responsable del tratamiento de tus datos es <Owner field="name" label="nombre" />, con
          domicilio en <Owner field="address" label="domicilio" />. Para cualquier cuestión sobre
          tus datos puedes escribir a <Owner field="email" label="correo de contacto" />.
        </p>
      </Section>

      <Section id="datos" title="2. Qué datos tratamos">
        <ul className={LIST}>
          <li>
            <strong>Datos de tu cuenta:</strong> tu nombre, tu correo electrónico y tu contraseña.
            La contraseña nunca se guarda tal cual: solo se guarda un resumen cifrado (bcrypt) que
            no permite recuperarla.
          </li>
          <li>
            <strong>Seguridad de la cuenta:</strong> el número de intentos fallidos de inicio de
            sesión y, si se bloquea, hasta cuándo. Tras 5 intentos fallidos seguidos la cuenta se
            bloquea durante 15 minutos.
          </li>
          <li>
            <strong>Tus reservas:</strong> qué libro reservas, en qué librería, el precio del
            momento, las fechas y su estado (pendiente, lista, recogida, cancelada o caducada).
          </li>
          <li>
            <strong>Tus favoritos:</strong> los libros que marcas con el corazón.
          </li>
          <li>
            <strong>Registro de actividad:</strong> Bookia guarda qué cambios hacen los
            administradores (por ejemplo, marcar una reserva como lista o desactivar una cuenta). Si
            el cambio afecta a tu cuenta, el registro incluye tu nombre y tu correo, nunca tu
            contraseña.
          </li>
        </ul>
        <p>
          No pedimos datos sensibles, datos bancarios ni de pago: las reservas se pagan en la
          librería al recogerlas.
        </p>
      </Section>

      <Section id="finalidades" title="3. Para qué los usamos">
        <ul className={LIST}>
          <li>Crear y gestionar tu cuenta y mantener tu sesión iniciada.</li>
          <li>Gestionar tus reservas para que la librería pueda prepararte el libro.</li>
          <li>Guardar y mostrarte tu lista de favoritos.</li>
          <li>
            Proteger las cuentas y el servicio: bloquear los intentos repetidos de acceso y limitar
            el número de intentos de inicio de sesión y de registro desde una misma conexión.
          </li>
          <li>Llevar un registro de los cambios que hacen los administradores.</li>
        </ul>
        <p>
          No usamos tus datos para publicidad, no hacemos perfiles comerciales y no vendemos ni
          cedemos tus datos a terceros.
        </p>
        <p>
          Tratamos tus datos porque son necesarios para darte el servicio que pides al crear tu
          cuenta. La seguridad y el registro de actividad se basan en nuestro interés legítimo en
          proteger el servicio.
        </p>
      </Section>

      <Section id="terceros" title="4. Con quién se comparten">
        <ul className={LIST}>
          <li>
            <strong>Administradores de Bookia:</strong> ven tu nombre, tu correo y tus reservas para
            gestionarlas.
          </li>
          <li>
            <strong>Alojamiento de la base de datos:</strong> los datos se guardan en MongoDB Atlas,
            un proveedor de bases de datos en la nube que actúa por cuenta nuestra.
          </li>
          <li>
            <strong>Portadas de los libros:</strong> las imágenes de las portadas se cargan desde
            Open Library (covers.openlibrary.org). Para mostrarlas, tu navegador se conecta a ese
            servicio, que recibe tu dirección IP y el ISBN del libro, pero ningún dato de tu cuenta.
          </li>
        </ul>
      </Section>

      <Section id="cookies" title="5. Cookies">
        <p>
          Bookia usa una sola cookie, <code className="text-sm">bookia_session</code>, que es
          técnica y necesaria: mantiene tu sesión iniciada durante 24 horas como máximo y se borra
          al cerrar sesión. No es accesible desde JavaScript y solo viaja por conexiones seguras.
        </p>
        <p>No usamos cookies de análisis, de publicidad ni de seguimiento.</p>
      </Section>

      <Section id="conservacion" title="6. Cuánto tiempo los guardamos">
        <p>
          Conservamos los datos de tu cuenta, tus reservas y tus favoritos mientras tu cuenta
          exista. Si un libro se retira del catálogo, desaparece de tus favoritos. Si pides que
          borremos tu cuenta, eliminaremos tus datos salvo los que la ley nos obligue a conservar.
        </p>
      </Section>

      <Section id="derechos" title="7. Tus derechos">
        <p>Puedes, en cualquier momento:</p>
        <ul className={LIST}>
          <li>
            <strong>Acceder</strong> a tus datos y saber cómo los tratamos.
          </li>
          <li>
            <strong>Rectificarlos</strong> si son inexactos o están incompletos.
          </li>
          <li>
            <strong>Cancelarlos o suprimirlos</strong>, es decir, pedir que borremos tu cuenta.
          </li>
          <li>
            <strong>Oponerte</strong> a un tratamiento o pedir que lo limitemos.
          </li>
          <li>
            <strong>Recibir tus datos</strong> en un formato que puedas llevar a otro servicio.
          </li>
        </ul>
        <p>
          Para ejercerlos, escribe a <Owner field="email" label="correo de contacto" /> desde el
          correo de tu cuenta e indica qué derecho quieres ejercer. Te responderemos en los plazos
          que marca la ley. Si no quedas conforme, puedes reclamar ante la autoridad de protección
          de datos competente.
        </p>
      </Section>

      <Section id="seguridad" title="8. Cómo protegemos tus datos">
        <ul className={LIST}>
          <li>Las contraseñas se guardan cifradas y nunca se muestran ni a los administradores.</li>
          <li>La sesión viaja en una cookie protegida y solo por conexiones seguras (HTTPS).</li>
          <li>
            Las cuentas se bloquean temporalmente tras varios intentos fallidos de inicio de sesión.
          </li>
          <li>
            Solo los administradores acceden a la gestión y cada cambio que hacen queda registrado.
          </li>
        </ul>
      </Section>

      <Section id="cambios" title="9. Cambios en esta política">
        <p>
          Si cambiamos esta política, actualizaremos la fecha del principio y lo indicaremos de
          forma visible en Bookia.
        </p>
      </Section>

      <p className="border-t border-stone-200 pt-6 text-sm">
        <Link
          to="/"
          className="font-medium text-primary-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
        >
          Volver al catálogo
        </Link>
      </p>
    </article>
  );
}
