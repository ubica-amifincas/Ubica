/**
 * Título, descripción e indexación de cada página, y direcciones de los inmuebles.
 * Lo usan la app (useDocumentTitle) y el middleware de Vercel, que lo pone en el HTML antes de enviarlo
 * para que Google, WhatsApp o Facebook vean los datos de cada página sin ejecutar JavaScript.
 * JavaScript sin imports (los tipos están en pages.d.ts): el middleware de Vercel no empaqueta .ts importados.
 */

export const UBICA_ORIGIN = 'https://ubica.amifincas.es';
export const AMI_ORIGIN = 'https://amifincas.es';

export const UBICA_TITLE = 'Ubica by AMI Fincas | Inmuebles en Murcia, Alicante y toda España';
export const UBICA_DESCRIPTION = 'Ubica, el portal inmobiliario de AMI Fincas: pisos, casas, apartamentos, bajos comerciales y terrenos en venta y alquiler en la Región de Murcia, la provincia de Alicante y toda España.';
export const AMI_TITLE = 'AMI Fincas | Administración de fincas en Murcia y Alicante';
export const AMI_DESCRIPTION = 'AMI Fincas: administración de comunidades de propietarios, gestión de alquileres y correduría de seguros en la Región de Murcia y Alicante. Presupuesto sin compromiso.';

/** Páginas propias de AMI Fincas: en Ubica redirigen a amifincas.es. */
export const AMI_ONLY_PATHS = ['/san-pedro-del-pinatar'];

/** Páginas que se sirven también en la web de AMI Fincas (el resto vive en Ubica). */
export const AMI_SITE_PATHS = ['/', ...AMI_ONLY_PATHS, '/aviso-legal', '/privacy', '/politica-cookies'];

// Páginas públicas de Ubica (las que se indexan)
/** @type {Record<string, [string, string?]>} */
const UBICA_PUBLIC = {
  '/': [UBICA_TITLE, UBICA_DESCRIPTION],
  '/about': ['Sobre nosotros | Ubica', 'Ubica es el portal inmobiliario de AMI Fincas, con base en la Región de Murcia y Alicante y para toda España: quiénes somos y cómo te ayudamos a comprar, vender o alquilar.'],
  '/contact': ['Contacto | Ubica', 'Contacta con Ubica y AMI Fincas: teléfono, WhatsApp, correo y oficinas en Murcia y San Pedro del Pinatar.'],
  '/entretenimiento': ['Ubica Play · Entretenimiento | Ubica', 'Ubica Play: juegos sobre el mercado inmobiliario para poner a prueba tu ojo para los precios.'],
  '/entretenimiento/tasador': ['Tasador Exprés · Ubica Play', 'Juego de Ubica Play: adivina el precio de inmuebles reales a partir de sus fotos, la zona y los metros.'],
  '/privacy': ['Política de privacidad | Ubica', 'Cómo tratamos tus datos personales en Ubica (MAYNSASER 2014, S.L.).'],
  '/terms': ['Términos de servicio | Ubica', 'Condiciones de uso del portal inmobiliario Ubica.'],
  '/politica-cookies': ['Política de cookies | Ubica', 'Qué cookies usa Ubica y cómo configurarlas.'],
  '/aviso-legal': ['Aviso legal | Ubica', 'Aviso legal de Ubica: titular, condiciones de uso y propiedad intelectual.'],
};

// Páginas de uso privado o de un solo paso: existen, pero no se indexan
/** @type {Record<string, string>} */
const UBICA_PRIVATE = {
  '/login': 'Iniciar sesión | Ubica',
  '/register': 'Registrarse | Ubica',
  '/verify': 'Verificar correo | Ubica',
  '/forgot-password': 'Recuperar contraseña | Ubica',
  '/reset-password': 'Nueva contraseña | Ubica',
  '/confirm-email-change': 'Confirmar cambio de correo | Ubica',
  '/publicar': 'Subir inmueble | Ubica',
  '/entretenimiento/balance': 'La Torre Fincas · Ubica Play',
  '/escaparate': 'Escaparate | AMI Fincas · Ubica',
  '/dashboard': 'Mi panel | Ubica',
  '/dashboard/properties': 'Mis propiedades | Ubica',
  '/dashboard/sales': 'Ventas | Ubica',
  '/dashboard/rentals': 'Alquileres | Ubica',
  '/dashboard/investments': 'Inversiones | Ubica',
  '/dashboard/wealth': 'Mi cartera inmobiliaria | Ubica',
  '/dashboard/settings/profile': 'Mi perfil | Ubica',
  '/dashboard/settings/email': 'Cambiar email | Ubica',
  '/dashboard/settings/password': 'Cambiar contraseña | Ubica',
  '/investor': 'Panel de inversor | Ubica',
  '/investor/oportunidades': 'Oportunidades | Panel de inversor | Ubica',
  '/investor/patrimonio': 'Mi cartera inmobiliaria | Panel de inversor | Ubica',
  '/realtor': 'Panel de inmobiliaria | Ubica',
  '/realtor/propiedades': 'Cartera de inmuebles | Panel de inmobiliaria | Ubica',
  '/realtor/alquileres': 'Alquileres | Panel de inmobiliaria | Ubica',
  '/realtor/ventas': 'Ventas | Panel de inmobiliaria | Ubica',
  '/realtor/estadisticas': 'Estadísticas | Panel de inmobiliaria | Ubica',
  '/admin': 'Panel de administración | Ubica',
  '/admin/usuarios': 'Usuarios | Panel de administración | Ubica',
  '/admin/propiedades': 'Propiedades | Panel de administración | Ubica',
};
// Cualquier subruta de un panel es privada aunque no esté en la lista (redirecciones internas)
const UBICA_PRIVATE_PREFIXES = ['/dashboard/', '/admin/', '/realtor/', '/investor/'];

/** @type {Record<string, [string, string?]>} */
const AMI_PAGES = {
  '/': [AMI_TITLE, AMI_DESCRIPTION],
  '/san-pedro-del-pinatar': [
    'Administrador de fincas en San Pedro del Pinatar y el Mar Menor | AMI Fincas',
    'Administración de comunidades y urbanizaciones en San Pedro del Pinatar, Lo Pagán, San Javier, Santiago de la Ribera, Pilar de la Horadada y Torrevieja. Oficina en San Pedro; atendemos en español e inglés.',
  ],
  '/aviso-legal': ['Aviso legal | AMI Fincas', 'Aviso legal de AMI Fincas (MAYNSASER 2014, S.L.): titular, condiciones de uso y propiedad intelectual.'],
  '/privacy': ['Política de privacidad | AMI Fincas', 'Cómo tratamos tus datos personales en AMI Fincas (MAYNSASER 2014, S.L.).'],
  '/politica-cookies': ['Política de cookies | AMI Fincas', 'Qué cookies usa la web de AMI Fincas y cómo configurarlas.'],
};

export const normalizePath = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path) || '/';

/** Datos de una página fija. Las fichas de inmueble los ponen aparte (propertyMeta). */
export function pageMeta(site, rawPath) {
  const path = normalizePath(rawPath);
  if (site === 'ami') {
    const entry = AMI_PAGES[path];
    return entry
      ? { title: entry[0], description: entry[1] ?? AMI_DESCRIPTION, index: true, known: true }
      : { title: 'Página no encontrada | AMI Fincas', description: AMI_DESCRIPTION, index: false, known: false };
  }
  const entry = UBICA_PUBLIC[path];
  if (entry) return { title: entry[0], description: entry[1] ?? UBICA_DESCRIPTION, index: true, known: true };
  const privateTitle = UBICA_PRIVATE[path];
  if (privateTitle || UBICA_PRIVATE_PREFIXES.some(p => path.startsWith(p))) {
    return { title: privateTitle ?? 'Mi panel | Ubica', description: UBICA_DESCRIPTION, index: false, known: true };
  }
  if (parsePropertyId(path) !== null) {
    return { title: 'Inmueble | Ubica', description: UBICA_DESCRIPTION, index: true, known: true };
  }
  return { title: 'Página no encontrada | Ubica', description: UBICA_DESCRIPTION, index: false, known: false };
}

/** Páginas públicas que van al sitemap de Ubica (las fichas de inmueble se añaden aparte). */
export const UBICA_SITEMAP_PATHS = Object.keys(UBICA_PUBLIC);

// ─── Direcciones de los inmuebles ───────────────────────────────────────────

/** "Ático con vistas en Murcia" → "atico-con-vistas-en-murcia" */
export function slugify(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Dirección pública de un inmueble: /inmueble/123-piso-con-terraza-en-murcia */
export function propertyPath(p) {
  const slug = slugify(p.title || '');
  return `/inmueble/${p.id}${slug ? `-${slug}` : ''}`;
}

/** Id del inmueble en /inmueble/123-… o en la dirección antigua /property/123; null si no es una ficha. */
export function parsePropertyId(path) {
  const match = /^\/(?:inmueble|property)\/(\d+)(?:-[a-z0-9-]*)?\/?$/.exec(path);
  return match ? Number(match[1]) : null;
}
