/**
 * Middleware de Vercel (se ejecuta antes de servir cada página).
 *
 * - La raíz de amifincas.es es la web de AMI Fincas (ami.html); sus otras direcciones, salvo los textos
 *   legales, son de Ubica y se redirigen allí (antes lo hacía la app en el navegador).
 * - Pone en el HTML el título, la descripción, la URL canónica y la imagen de cada página, y los datos
 *   estructurados, para que Google, WhatsApp o Facebook los vean sin ejecutar JavaScript.
 *   En las fichas de inmueble los saca de la API (foto, precio, zona).
 * - Las fichas tienen dirección legible (/inmueble/123-piso-en-murcia): la antigua /property/123 redirige.
 * - Sirve /robots.txt según el dominio y /sitemap.xml de Ubica con los inmuebles publicados.
 * Si algo falla (API dormida, sin red), se sirve la página tal cual: nunca bloquea la web.
 */
import {
  AMI_ORIGIN, AMI_SITE_PATHS, UBICA_ORIGIN, UBICA_SITEMAP_PATHS,
  normalizePath, pageMeta, parsePropertyId, propertyPath,
} from './src/seo/pages.ts';

export const config = {
  // Páginas (sin punto en la ruta) más robots y sitemap; los ficheros estáticos van directos
  matcher: ['/((?!assets/|icons/|images/|ami-fincas/|uploads/)[^.]*)', '/robots.txt', '/sitemap.xml'],
};

const API = 'https://ubica-backend.onrender.com/api';
const UBICA_IMAGE = `${UBICA_ORIGIN}/og-ubica.jpg`;
const AMI_IMAGE = `${AMI_ORIGIN}/og-ami.jpg`;
const PROD_HOSTS = ['ubica.amifincas.es', 'amifincas.es'];
const PRIVATE_PATHS = ['/dashboard', '/admin', '/realtor', '/investor', '/publicar'];

const TYPE_LABELS: Record<string, string> = {
  flat: 'Piso', apartment: 'Apartamento', house: 'Casa', townhouse: 'Adosado', villa: 'Villa', chalet: 'Chalet',
  penthouse: 'Ático', duplex: 'Dúplex', studio: 'Estudio', land: 'Terreno',
};

interface ApiProperty {
  id: number; title: string; price: number; type: string; status: string; region?: string | null;
  bedrooms?: number | null; bathrooms?: number | null; area?: number | null;
  address?: string | null; city?: string | null; description?: string | null;
  images?: string[]; latitude?: number | null; longitude?: number | null;
  created_at?: string; updated_at?: string;
}

const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── HTML ───────────────────────────────────────────────────────────────────

function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`;
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`);
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

interface HeadData {
  title: string; description: string; url: string; image: string; index: boolean; jsonLd: object[];
}

export function applyHead(html: string, head: HeadData): string {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(head.title)}</title>`);
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(head.url)}" />`);
  out = setMeta(out, 'name', 'description', head.description);
  out = setMeta(out, 'property', 'og:title', head.title);
  out = setMeta(out, 'property', 'og:description', head.description);
  out = setMeta(out, 'property', 'og:url', head.url);
  out = setMeta(out, 'property', 'og:image', head.image);
  // Las medidas del HTML son las de la imagen general (1200x630); la foto de un inmueble tiene otras
  if (head.image !== UBICA_IMAGE && head.image !== AMI_IMAGE) {
    out = out.replace(/\s*<meta property="og:image:(?:width|height)" content="[^"]*"\s*\/?>/g, '');
  }
  out = setMeta(out, 'name', 'twitter:card', 'summary_large_image');
  out = setMeta(out, 'name', 'twitter:title', head.title);
  out = setMeta(out, 'name', 'twitter:description', head.description);
  out = setMeta(out, 'name', 'twitter:image', head.image);
  out = setMeta(out, 'name', 'twitter:url', head.url);
  if (!head.index) out = setMeta(out, 'name', 'robots', 'noindex, follow');
  for (const data of head.jsonLd) {
    // "<" escapado: un texto con "</script>" no puede cerrar la etiqueta
    out = out.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n</head>`);
  }
  return out;
}

// ─── Fichas de inmueble ─────────────────────────────────────────────────────

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const isRent = (p: ApiProperty) => p.status === 'for-rent';
const absolute = (src: string) => (src.startsWith('http') ? src : `${UBICA_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`);

export function propertyDescription(p: ApiProperty): string {
  const what = `${TYPE_LABELS[p.type] ?? 'Inmueble'} en ${isRent(p) ? 'alquiler' : 'venta'}${p.city ? ` en ${p.city}` : ''}`;
  const facts = [
    `${eur(p.price)}${isRent(p) ? '/mes' : ''}`,
    p.bedrooms ? `${p.bedrooms} hab.` : '',
    p.bathrooms ? `${p.bathrooms} baños` : '',
    p.area ? `${Math.round(p.area)} m²` : '',
  ].filter(Boolean).join(' · ');
  const text = (p.description || '').replace(/\s+/g, ' ').trim();
  const full = `${what}: ${facts}.${text ? ` ${text}` : ''}`;
  return full.length > 160 ? `${full.slice(0, 157).replace(/\s+\S*$/, '')}…` : full;
}

export function listingJsonLd(p: ApiProperty, url: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    url,
    description: propertyDescription(p),
    ...(p.images?.length ? { image: p.images.slice(0, 6).map(absolute) } : {}),
    ...(p.created_at ? { datePosted: p.created_at.slice(0, 10) } : {}),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'EUR',
      businessFunction: isRent(p) ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: p.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
    },
    about: {
      '@type': p.type === 'land' ? 'Place' : ['flat', 'apartment', 'penthouse', 'studio', 'duplex'].includes(p.type) ? 'Apartment' : 'SingleFamilyResidence',
      ...(p.bedrooms ? { numberOfRooms: p.bedrooms } : {}),
      ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
      ...(p.area ? { floorSize: { '@type': 'QuantitativeValue', value: p.area, unitCode: 'MTK' } } : {}),
      address: {
        '@type': 'PostalAddress',
        ...(p.address ? { streetAddress: p.address } : {}),
        ...(p.city ? { addressLocality: p.city } : {}),
        ...(p.region ? { addressRegion: p.region } : {}),
        addressCountry: 'ES',
      },
      ...(p.latitude != null && p.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude } } : {}),
    },
  };
}

const UBICA_SITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Ubica',
  url: `${UBICA_ORIGIN}/`,
  inLanguage: 'es',
  publisher: {
    '@type': 'Organization',
    name: 'AMI Fincas',
    url: `${AMI_ORIGIN}/`,
    logo: `${UBICA_ORIGIN}/icons/icon-512.png`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${UBICA_ORIGIN}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

// ─── robots y sitemap ───────────────────────────────────────────────────────

function robots(host: string): Response {
  let body: string;
  if (!PROD_HOSTS.includes(host)) {
    // Vistas previas de Vercel: que no compitan con la web real en Google
    body = 'User-agent: *\nDisallow: /\n';
  } else if (host === 'amifincas.es') {
    body = `User-agent: *\nAllow: /\n\nSitemap: ${AMI_ORIGIN}/sitemap-ami.xml\n`;
  } else {
    body = `User-agent: *\nAllow: /\n${PRIVATE_PATHS.map(p => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${UBICA_ORIGIN}/sitemap.xml\n`;
  }
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

async function sitemap(): Promise<Response> {
  const urls = UBICA_SITEMAP_PATHS.map(path => `  <url><loc>${UBICA_ORIGIN}${path === '/' ? '/' : path}</loc></url>`);
  const res = await fetchWithTimeout(`${API}/properties?limit=1000`, 4000);
  if (res?.ok) {
    try {
      const list = (await res.json()) as ApiProperty[];
      for (const p of list) {
        const lastmod = (p.updated_at || p.created_at || '').slice(0, 10);
        urls.push(`  <url><loc>${UBICA_ORIGIN}${esc(propertyPath(p))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`);
      }
    } catch { /* sin inmuebles: solo las páginas fijas */ }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

// ─── Entrada ────────────────────────────────────────────────────────────────

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = url.hostname;
  const path = normalizePath(url.pathname);

  // www.amifincas.es y la dirección antigua /ami-fincas: las redirecciones de vercel.json
  if (host === 'www.amifincas.es' || path === '/ami-fincas') return next();
  if (path === '/robots.txt') return robots(host);
  if (path === '/sitemap.xml') return host === 'amifincas.es' ? next() : sitemap();

  const isAmi = host === 'amifincas.es';
  const isProd = PROD_HOSTS.includes(host);
  // En amifincas.es solo están la portada de AMI y los textos legales; lo demás es Ubica
  if (isAmi && !AMI_SITE_PATHS.includes(path)) {
    return Response.redirect(`${UBICA_ORIGIN}${url.pathname}${url.search}`, 301);
  }

  const origin = isAmi ? AMI_ORIGIN : UBICA_ORIGIN;
  const meta = pageMeta(isAmi ? 'ami' : 'ubica', path);
  const head: HeadData = {
    title: meta.title,
    description: meta.description,
    url: `${origin}${path}`,
    image: isAmi ? AMI_IMAGE : UBICA_IMAGE,
    index: meta.index && isProd,
    jsonLd: !isAmi && path === '/' ? [UBICA_SITE_JSONLD] : [],
  };
  let status = meta.known ? 200 : 404;

  const propertyId = isAmi ? null : parsePropertyId(path);
  if (propertyId !== null) {
    const res = await fetchWithTimeout(`${API}/properties/${propertyId}`, 2000);
    if (res?.status === 404) {
      status = 404;
      head.title = 'Inmueble no disponible | Ubica';
      head.index = false;
    } else if (res?.ok) {
      const p = (await res.json()) as ApiProperty;
      const canonicalPath = propertyPath(p);
      // Dirección antigua o título cambiado: a la dirección buena, para que Google solo vea una
      if (path !== canonicalPath) return Response.redirect(`${UBICA_ORIGIN}${canonicalPath}${url.search}`, 301);
      head.title = `${p.title} | Ubica`;
      head.description = propertyDescription(p);
      head.url = `${UBICA_ORIGIN}${canonicalPath}`;
      if (p.images?.[0]) head.image = absolute(p.images[0]);
      head.jsonLd = [listingJsonLd(p, head.url)];
    }
    // API dormida o sin respuesta: se sirve la ficha con los datos generales y la app la carga después
  }

  const shell = await fetchWithTimeout(new URL(isAmi ? '/ami.html' : '/index.html', url).toString(), 3000);
  if (!shell?.ok) return next();
  const html = applyHead(await shell.text(), head);
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' },
  });
}
