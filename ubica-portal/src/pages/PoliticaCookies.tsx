import LegalLayout, { H2, H3, List, ExtLink, Table } from '../components/legal/LegalLayout';
import { useCookieConsent } from '../contexts/CookieConsentContext';

const C = ({ children }: { children: string }) => <strong className="whitespace-nowrap">{children}</strong>;

const GOOGLE_TOOLS = 'Descargar ciertas herramientas de Google y guardar ciertas preferencias, por ejemplo, el número de resultados de la búsqueda por hoja o la activación del filtro SafeSearch. Ajusta los anuncios que aparecen en la búsqueda de Google.';
const ADS_DELIVERY = 'Utilizada para la entrega de anuncios más relevantes, segmentación publicitaria y mantenimiento de la seguridad de la sesión de anuncios';
const ADS_GOOGLE = 'Cookie publicitaria de Google Ads';
const STATS = 'Estas cookies se utilizan para recopilar estadísticas del sitio web y rastrear las tasas de conversión y la personalización de anuncios de Google';

export default function PoliticaCookies() {
  const { openSettings } = useCookieConsent();

  return (
    <LegalLayout title="Política de cookies">
      <H2>INFORMACIÓN SOBRE COOKIES</H2>
      <p>
        Conforme con la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico
        (LSSI), en relación con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016,
        General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos y Garantía
        de los Derechos Digitales (LOPDGDD), es obligado obtener el consentimiento expreso del usuario de todas las páginas
        web que usan cookies prescindibles, antes de que este navegue por ellas.
      </p>

      <H2>¿QUÉ SON LAS COOKIES?</H2>
      <p>
        Las <em>cookies</em> y otras tecnologías similares tales como local shared objects, flash <em>cookies</em> o píxeles, son herramientas
        empleadas por los servidores Web para almacenar y recuperar información acerca de sus visitantes, así como para
        ofrecer un correcto funcionamiento del sitio.
      </p>
      <p>
        Mediante el uso de estos dispositivos se permite al servidor Web recordar algunos datos concernientes al usuario,
        como sus preferencias para la visualización de las páginas de ese servidor, nombre y contraseña, productos que más le
        interesan, etc.
      </p>

      <H2><em>COOKIES</em> AFECTADAS POR LA NORMATIVA Y COOKIES EXCEPTUADAS</H2>
      <p>
        Según la directiva de la UE, las <em>cookies</em> que requieren el consentimiento informado por parte del usuario son las <em>cookies</em>{' '}
        de analítica y las de publicidad y afiliación, quedando exceptuadas las de carácter técnico y las necesarias para el
        funcionamiento del sitio web o la prestación de servicios expresamente solicitados por el usuario.
      </p>

      <H2>TIPOS DE COOKIES</H2>
      <H3>SEGÚN LA FINALIDAD</H3>
      <List>
        <li><strong><em>Cookies</em> técnicas y funcionales</strong>: son aquellas que permiten al usuario la navegación a través de una página web,
          plataforma o aplicación y la utilización de las diferentes opciones o servicios que en ella existan.</li>
        <li><strong><em>Cookies</em> analíticas</strong>: son aquellas que permiten al responsable de las mismas el seguimiento y análisis del
          comportamiento de los usuarios de los sitios web a los que están vinculadas. La información recogida mediante
          este tipo de <em>cookies</em> se utiliza en la medición de la actividad de los sitios web, aplicación o plataforma y para la
          elaboración de perfiles de navegación de los usuarios de dichos sitios, aplicaciones y plataformas, con el fin de
          introducir mejoras en función del análisis de los datos de uso que hacen los usuarios del servicio.</li>
        <li><strong><em>Cookies</em> publicitarias:</strong> son aquellas que permiten la gestión, de la forma más eficaz posible, de los espacios
          publicitarios que, en su caso, el editor haya incluido en una página web, aplicación o plataforma desde la que
          presta el servicio solicitado en base a criterios como el contenido editado o la frecuencia en la que se muestran
          los anuncios.</li>
        <li><strong><em>Cookies</em> de publicidad comportamental</strong>: recogen información sobre las preferencias y elecciones personales del
          usuario (<em>retargeting</em>) para permitir la gestión, de la forma más eficaz posible, de los espacios publicitarios que,
          en su caso, el editor haya incluido en una página web, aplicación o plataforma desde la que presta el servicio
          solicitado.</li>
        <li><strong><em>Cookies</em> sociales</strong>: son establecidas por las plataformas de redes sociales en los servicios para permitirle
          compartir contenido con sus amigos y redes. Las plataformas de medios sociales tienen la capacidad de rastrear
          su actividad en línea fuera de los Servicios. Esto puede afectar al contenido y los mensajes que ve en otros
          servicios que visita.</li>
        <li><strong><em>Cookies</em> de afiliados</strong>: permiten hacer un seguimiento de las visitas procedentes de otras webs, con las que el
          sitio web establece un contrato de afiliación (empresas de afiliación).</li>
        <li><strong><em>Cookies</em> de seguridad</strong>: almacenan información cifrada para evitar que los datos guardados en ellas sean
          vulnerables a ataques maliciosos de terceros.</li>
      </List>

      <H3>SEGÚN LA PROPIEDAD</H3>
      <List>
        <li><strong><em>Cookies</em> propias</strong>: son aquellas que se envían al equipo terminal del usuario desde un equipo o dominio
          gestionado por el propio editor y desde el que se presta el servicio solicitado por el usuario.</li>
        <li><strong><em>Cookies</em> de terceros:</strong> son aquellas que se envían al equipo terminal del usuario desde un equipo o dominio que
          no es gestionado por el editor, sino por otra entidad que trata los datos obtenidos través de las cookies.</li>
      </List>

      <H3>SEGÚN EL PLAZO DE CONSERVACIÓN</H3>
      <List>
        <li><strong><em>Cookies</em> de sesión:</strong> son un tipo de <em>cookies</em> diseñadas para recabar y almacenar datos mientras el usuario accede
          a una página web.</li>
        <li><strong><em>Cookies</em> persistentes:</strong> son un tipo de cookies en el que los datos siguen almacenados en el terminal y pueden
          ser accedidos y tratados durante un período definido por el responsable de la <em>cookie</em>, y que puede ir de unos
          minutos a varios años.</li>
      </List>

      <H2>TRATAMIENTO DE DATOS PERSONALES</H2>
      <p>
        MAYNSASER 2014. S.L es el <strong>Responsable del tratamiento</strong> de los datos personales del <strong>Interesado</strong> y le informa de que
        estos datos serán tratados de conformidad con lo dispuesto en el Reglamento (UE) 2016/679, de 27 de abril de 2016
        (RGPD), por lo que se le facilita la siguiente información del tratamiento:
      </p>
      <p><strong>Fines del tratamiento:</strong> según se especifica en el apartado de <em>cookies</em> que se utilizan en este sitio web.</p>
      <p><strong>Legitimación del tratamiento</strong>: salvo en los casos en los que resulte necesario para la navegación por la web, por
        consentimiento del interesado (art. 6.1.a RGPD).</p>
      <p><strong>Criterios de conservación de los datos</strong>: según se especifica en el apartado de <em>cookies</em> utilizadas en la web.</p>
      <p><strong>Comunicación de los datos</strong>: no se comunicarán los datos a terceros, excepto en cookies propiedad de terceros o por
        obligación legal.</p>
      <p><strong>Derechos que asisten al Interesado</strong>:</p>
      <p>
        - Derecho a retirar el consentimiento en cualquier momento.<br />
        - Derecho de acceso, rectificación, portabilidad y supresión de sus datos, y de limitación u oposición a su tratamiento.<br />
        - Derecho a presentar una reclamación ante la Autoridad de control (<ExtLink href="https://www.aepd.es" />) si considera que el tratamiento no
        se ajusta a la normativa vigente.
      </p>
      <p><strong>Datos de contacto para ejercer sus derechos:</strong></p>
      <p>MAYNSASER 2014. S.L. AVDA. CASILLAS DE CORIA, 4 - 30007 MURCIA (Murcia)</p>

      <H2>COOKIES UTILIZADAS EN ESTE SITIO WEB</H2>
      <H3>COOKIES CONTROLADAS POR EL EDITOR</H3>
      <H3>Técnicas y funcionales</H3>
      <Table
        head={['Propiedad', 'Cookie', 'Finalidad', 'Plazo']}
        rows={[
          ['google.com', <C>AEC</C>, 'Cookie necesaria para la utilización de las opciones y servicios del sitio web', 'en 6 meses'],
          ['Google', <C>SEARCH_SAMESITE</C>, 'SameSite evita que el navegador envíe esta cookie junto con las solicitudes entre sitios. El objetivo principal es mitigar el riesgo de fuga de información de origen cruzado. También proporciona cierta protección contra ataques de falsificación de solicitudes entre sitios.', 'en 5 meses'],
          ['google.com', <C>SOCS</C>, 'Cookie necesaria para la utilización de las opciones y servicios del sitio web', 'en 12 meses'],
        ]}
      />
      <H3>Publicitarias</H3>
      <Table
        head={['Propiedad', 'Cookie', 'Finalidad', 'Plazo']}
        rows={[
          ['google.com', <C>__Secure-1PAPISID</C>, ADS_DELIVERY, 'en un año'],
          ['google.com', <C>__Secure-1PSID</C>, ADS_GOOGLE, 'en un año'],
          ['google.com', <C>__Secure-1PSIDCC</C>, ADS_GOOGLE, 'en un año'],
          ['google.com', <C>__Secure-1PSIDTS</C>, ADS_GOOGLE, 'en un año'],
          ['Google', <C>__Secure-3PAPISID</C>, 'Estas cookies se utilizan para entregar anuncios más relevantes para usted y sus intereses.', 'en un año'],
          ['google.com', <C>__Secure-3PSIDCC</C>, ADS_DELIVERY, 'en un año'],
          ['google.com', <C>__Secure-3PSIDTS</C>, ADS_DELIVERY, 'en un año'],
          ['google.com', <C>__Secure-BUCKET</C>, ADS_GOOGLE, 'en 2 meses'],
          ['google.com', <C>__Secure-STRP</C>, ADS_GOOGLE, 'Sesión'],
          ['Google', <C>APISID</C>, GOOGLE_TOOLS, 'en un año'],
          ['Google', <C>DV</C>, STATS, 'Sesión'],
          ['Google', <C>HSID</C>, GOOGLE_TOOLS, 'en un año'],
          ['Google', <C>NID</C>, STATS, 'en 7 meses'],
          ['Google', <C>OTZ</C>, 'Análisis agregado de los visitantes del sitio', 'en un mes'],
          ['Google', <C>SAPISID</C>, GOOGLE_TOOLS, 'en un año'],
          ['Google', <C>SID</C>, GOOGLE_TOOLS, 'en un año'],
          ['Google', <C>SIDCC</C>, GOOGLE_TOOLS, 'en un año'],
          ['Google', <C>SSID</C>, 'Descarga ciertas herramientas de Google y guarda ciertas preferencias, por ejemplo, el número de resultados de búsqueda por página o la activación del filtro SafeSearch. Ajusta los anuncios que aparecen en la Búsqueda de Google.', 'en un año'],
        ]}
      />

      <H2>COOKIES DE TERCEROS</H2>
      <p>
        Los servicios de terceros son ajenos al control del editor. Los proveedores pueden modificar en todo momento sus
        condiciones de servicio, finalidad y utilización de las cookies, etc.
      </p>
      <p><strong>Proveedores externos de este sitio web:</strong></p>
      <Table
        head={['Editor', 'Política de privacidad']}
        rows={[
          ['Google', <ExtLink href="https://privacy.google.com/take-control.html" />],
          ['Google', <ExtLink href="https://safety.google/privacy/privacy-controls/" />],
          ['google.com', ''],
          ['google.com', <ExtLink href="https://safety.google/privacy/privacy-controls/" />],
        ]}
      />

      <H2>PANEL DE CONFIGURACIÓN DE COOKIES</H2>
      <p>
        Desde este panel podrá configurar las cookies que el sitio web puede instalar en su navegador, excepto las cookies
        técnicas o funcionales que son necesarias para la navegación y la utilización de las diferentes opciones o servicios que
        se ofrecen.
      </p>
      <p>
        <button type="button" onClick={openSettings} className="font-semibold text-emerald-700 dark:text-emerald-400 underline">
          Panel de cookies
        </button>
      </p>

      <H2>CÓMO GESTIONAR LAS COOKIES DESDE EL NAVEGADOR</H2>
      <Table
        head={['', '']}
        rows={[
          [<strong>Eliminar las cookies del dispositivo</strong>, 'Las cookies que ya están en un dispositivo se pueden eliminar borrando el historial del navegador, con lo que se suprimen las cookies de todos los sitios web visitados. Sin embargo, también se puede perder parte de la información guardada (por ejemplo, los datos de inicio de sesión o las preferencias de sitio web).'],
          [<strong>Gestionar las cookies específicas del sitio</strong>, 'Para tener un control más preciso de las cookies específicas de cada sitio, los usuarios pueden ajustar su configuración de privacidad y cookies en el navegador.'],
          [<strong>Bloquear las cookies</strong>, 'Aunque la mayoría de los navegadores modernos se pueden configurar para evitar que se instalen cookies en los dispositivos, eso puede obligar al ajuste manual de determinadas preferencias cada vez que se visite un sitio o página. Además, algunos servicios y características pueden no funcionar correctamente (por ejemplo, los inicios de sesión con perfil).'],
        ]}
      />

      <H2>CÓMO ELIMINAR LAS COOKIES DE LOS NAVEGADORES MÁS COMUNES</H2>
      <Table
        head={['Navegador', 'Enlace']}
        rows={[
          [<strong>Chrome</strong>, <ExtLink href="http://support.google.com/chrome/answer/95647?hl=es" />],
          [<strong>Edge</strong>, <ExtLink href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" />],
          [<strong>Explorer</strong>, <ExtLink href="https://support.microsoft.com/es-es/help/278835/how-to-delete-cookie-files-in-internet-explorer" />],
          [<strong>Firefox</strong>, <ExtLink href="https://www.mozilla.org/es-ES/privacy/websites/#cookies" />],
          [<strong>Safari</strong>, <ExtLink href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" />],
          [<strong>Opera</strong>, <ExtLink href="https://help.opera.com/en/latest/security-and-privacy/#clearBrowsingData" />],
        ]}
      />
    </LegalLayout>
  );
}
