/**
 * AMI Fincas tiene dos productos en un mismo despliegue:
 * - AMI Fincas (administración de fincas): https://amifincas.es
 * - Ubica (portal inmobiliario): https://ubica.amifincas.es
 * Este módulo decide en cuál estamos y construye los enlaces entre ambos.
 */
export const AMI_ORIGIN = 'https://amifincas.es';
export const UBICA_ORIGIN = 'https://ubica.amifincas.es';
/** Dirección antigua de la portada de AMI Fincas: ahora redirige a la raíz de amifincas.es. */
export const AMI_PATH = '/ami-fincas';

/** Páginas que se sirven también en la web de AMI Fincas (el resto vive en Ubica). */
export { AMI_ONLY_PATHS, AMI_SITE_PATHS } from '../seo/pages';

export type Site = 'ami' | 'ubica';

const AMI_HOSTS = ['amifincas.es', 'www.amifincas.es'];
const PROD_HOSTS = [...AMI_HOSTS, 'ubica.amifincas.es'];
const OVERRIDE_KEY = 'ubica-site';

const hostname = () => (typeof window !== 'undefined' ? window.location.hostname : '');

/** En producción cada producto tiene su dominio; en local y en las vistas previas comparten origen. */
export const isProductionHost = () => PROD_HOSTS.includes(hostname());

/**
 * Fuera de producción se elige la web con ?site=ami o ?site=ubica (se recuerda durante la sesión),
 * para poder probar las dos en local y en las vistas previas de Vercel.
 */
function devSite(): Site | null {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('site');
    if (fromQuery === 'ami' || fromQuery === 'ubica') sessionStorage.setItem(OVERRIDE_KEY, fromQuery);
    const stored = sessionStorage.getItem(OVERRIDE_KEY);
    return stored === 'ami' || stored === 'ubica' ? stored : null;
  } catch {
    return null;
  }
}

function detectSite(): Site {
  const host = hostname();
  if (AMI_HOSTS.includes(host)) return 'ami';
  if (host === 'ubica.amifincas.es' || !host) return 'ubica';
  return devSite() ?? 'ubica';
}

export const SITE: Site = detectSite();
export const isAmiSite = SITE === 'ami';

/** Enlace a una página de la web de AMI Fincas (por defecto, su portada). */
export function amiHref(path = '/'): string {
  if (isProductionHost()) return `${AMI_ORIGIN}${path}`;
  return isAmiSite ? path : withSiteParam(path, 'ami');
}

/** Enlace a una página de Ubica (por defecto, su portada). */
export function ubicaHref(path = '/'): string {
  if (isProductionHost()) return `${UBICA_ORIGIN}${path}`;
  return isAmiSite ? withSiteParam(path, 'ubica') : path;
}

function withSiteParam(path: string, site: Site): string {
  const [base, hash = ''] = path.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}site=${site}${hash ? `#${hash}` : ''}`;
}

/** Origen canónico de la web actual, para la etiqueta canonical y las metaetiquetas sociales. */
export const siteOrigin = () => (isAmiSite ? AMI_ORIGIN : UBICA_ORIGIN);
