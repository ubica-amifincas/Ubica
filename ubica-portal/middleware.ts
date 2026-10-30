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
 * - Para quien no ejecuta JavaScript (buscadores de IA como ChatGPT, Claude o Perplexity) pone el contenido de la
 *   página en texto dentro de #root (oculto con JS; React lo sustituye al cargar) y sirve /llms.txt.
 * Si algo falla (API dormida, sin red), se sirve la página tal cual: nunca bloquea la web.
 */
import {
  AMI_ORIGIN, AMI_SITE_PATHS, UBICA_ORIGIN, UBICA_SITEMAP_PATHS,
  normalizePath, pageMeta, parsePropertyId, propertyPath,
} from './src/seo/pages.js';
import { AMI, LEGAL_SUMMARIES, UBICA } from './src/seo/content.js';

export const config = {
  // Node.js: Vercel retira el runtime edge para el middleware
  runtime: 'nodejs',
  // Páginas (sin punto en la ruta) más robots y sitemap; los ficheros estáticos van directos
  matcher: ['/((?!assets/|icons/|images/|ami-fincas/|uploads/)[^.]*)', '/robots.txt', '/sitemap.xml', '/llms.txt'],
};

const API = 'https://ubica-backend.onrender.com/api';
const UBICA_IMAGE = `${UBICA_ORIGIN}/og-ubica.jpg`;
const AMI_IMAGE = `${AMI_ORIGIN}/og-ami.jpg`;
const PROD_HOSTS = ['ubica.amifincas.es', 'amifincas.es'];
const PRIVATE_PATHS = ['/dashboard', '/admin', '/realtor', '/investor', '/publicar'];
// Buscadores y asistentes de IA: se permiten de forma explícita (búsqueda y entrenamiento)
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot',
  'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'meta-externalagent'];

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

async function fetchWithTimeout(url: string, ms: number, headers: Record<string, string> = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { accept: 'application/json', ...headers } });
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
  /** Contenido de la página en HTML sencillo para quien no ejecuta JavaScript */
  body?: string;
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
  if (head.body) {
    // Visible sin JavaScript; con JavaScript lo oculta el CSS de la cabecera y React lo sustituye al cargar
    out = out.replace('<div id="root"></div>', `<div id="root"><main data-static>${head.body}</main></div>`);
  }
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
    sameAs: [AMI.instagram, `${AMI_ORIGIN}/`],
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${UBICA_ORIGIN}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

// ─── Contenido en texto (sin JavaScript) ────────────────────────────────────

const AMI_FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: AMI.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
const para = (text: string) => `<p>${esc(text)}</p>`;
const list = (items: string[]) => `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

function amiContact(): string {
  return `<h2>Contacto</h2>${list([
    `Teléfono y WhatsApp: ${esc(AMI.phone)}`,
    `Correo: ${link(`mailto:${AMI.email}`, AMI.email)}`,
    ...AMI.offices.map(o => `<strong>${esc(o.name)}</strong>: ${esc(o.address)} · Tel. ${esc(o.phone)} · ${esc(o.hours)} · ${link(o.map, 'Cómo llegar')}`),
  ])}`;
}

function amiHomeBody(): string {
  return [
    `<h1>${esc(AMI.name)}: administración de fincas en Murcia y Alicante</h1>`,
    para(AMI.summary),
    `<h2>Servicios</h2>`,
    list(AMI.services.map(([t, d]) => `<strong>${esc(t)}</strong>: ${esc(d)}`)),
    `<h2>Zonas</h2>`, para(`${AMI.zones}.`),
    amiContact(),
    `<h2>Cambiar de administrador</h2>`,
    `<ol>${AMI.switchSteps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`,
    `<h2>Preguntas frecuentes</h2>`,
    AMI.faqs.map(([q, a]) => `<h3>${esc(q)}</h3>${para(a)}`).join(''),
    `<h2>¿Buscas vivienda?</h2>`,
    `<p>${link(`${UBICA_ORIGIN}/`, 'Ubica')} es el portal inmobiliario de AMI Fincas.</p>`,
  ].join('');
}

const listingLine = (p: ApiProperty) =>
  `${link(propertyPath(p), p.title)}: ${esc(propertyDescription(p).split(':')[1]?.split('.')[0]?.trim() || eur(p.price))}${p.city ? ` (${esc(p.city)})` : ''}`;

function ubicaHomeBody(listings: ApiProperty[] | null): string {
  return [
    `<h1>Ubica: portal inmobiliario de AMI Fincas</h1>`,
    para(UBICA.summary),
    `<h2>Inmuebles publicados</h2>`,
    listings === null ? para('Consulta los inmuebles disponibles en la web.')
      : listings.length ? list(listings.map(listingLine)) : para('Todavía no hay inmuebles publicados.'),
    `<h2>Secciones</h2>`,
    list(UBICA.sections.map(([href, t, d]) => `${link(href, t)}: ${esc(d)}`)),
    `<p>Ubica es un servicio de ${link(`${AMI_ORIGIN}/`, 'AMI Fincas')}, administradores de fincas en Murcia y Alicante.</p>`,
  ].join('');
}

function propertyBody(p: ApiProperty): string {
  const facts = [
    `Precio: ${eur(p.price)}${isRent(p) ? ' al mes' : ''}`,
    `Tipo: ${TYPE_LABELS[p.type] ?? 'Inmueble'} en ${isRent(p) ? 'alquiler' : 'venta'}`,
    p.bedrooms ? `Habitaciones: ${p.bedrooms}` : '',
    p.bathrooms ? `Baños: ${p.bathrooms}` : '',
    p.area ? `Superficie: ${Math.round(p.area)} m²` : '',
    [p.address, p.city].filter(Boolean).length ? `Ubicación: ${[p.address, p.city].filter(Boolean).join(', ')}` : '',
  ].filter(Boolean).map(esc);
  return [
    `<h1>${esc(p.title)}</h1>`,
    list(facts),
    p.description ? para(p.description.replace(/\s+/g, ' ').trim()) : '',
    `<p>Anuncio publicado en ${link('/', 'Ubica')}, el portal inmobiliario de AMI Fincas. Contacto: ${esc(AMI.phone)}.</p>`,
  ].join('');
}

/** Contenido de las páginas fijas (las fichas y la portada de Ubica, que dependen de la API, van aparte). */
function pageBody(isAmi: boolean, path: string, title: string, description: string): string {
  if (isAmi && path === '/') return amiHomeBody();
  const name = title.replace(/ \| (Ubica|AMI Fincas)$/, '');
  if (LEGAL_SUMMARIES[path]) {
    return `<h1>${esc(name)}</h1>${para(`${LEGAL_SUMMARIES[path]} Titular: ${AMI.company}.`)}<p>${link('/', 'Volver al inicio')}</p>`;
  }
  if (path === '/about') return `<h1>Sobre nosotros</h1>${UBICA.about.map(para).join('')}${amiContact()}`;
  if (path === '/contact') return `<h1>Contacto</h1>${amiContact()}`;
  return `<h1>${esc(name)}</h1>${para(description)}<p>${link('/', 'Ir a la portada')}</p>`;
}

async function latestListings(limit: number, ms: number): Promise<ApiProperty[] | null> {
  const res = await fetchWithTimeout(`${API}/properties?limit=${limit}`, ms);
  if (!res?.ok) return null;
  try { return (await res.json()) as ApiProperty[]; } catch { return null; }
}

/** /llms.txt: resumen en Markdown para asistentes de IA (https://llmstxt.org). */
async function llms(host: string): Promise<Response> {
  let md: string;
  if (host === 'amifincas.es') {
    md = [
      `# ${AMI.name}`, '', `> ${AMI.summary}`, '',
      `Empresa: ${AMI.company}. Teléfono y WhatsApp: ${AMI.phone}. Correo: ${AMI.email}. Zonas: ${AMI.zones}.`, '',
      '## Servicios', '', ...AMI.services.map(([t, d]) => `- **${t}**: ${d}`), '',
      '## Sedes', '', ...AMI.offices.map(o => `- **${o.name}**: ${o.address}. Tel. ${o.phone}. ${o.hours}. [Mapa](${o.map})`), '',
      '## Preguntas frecuentes', '', ...AMI.faqs.flatMap(([q, a]) => [`### ${q}`, '', a, '']),
      '## Enlaces', '',
      `- [Web de AMI Fincas](${AMI_ORIGIN}/): servicios, sedes y presupuesto sin compromiso`,
      `- [Ubica](${UBICA_ORIGIN}/): portal inmobiliario de AMI Fincas`,
      `- [Aviso legal](${AMI_ORIGIN}/aviso-legal)`, `- [Política de privacidad](${AMI_ORIGIN}/privacy)`, '',
    ].join('\n');
  } else {
    const listings = await latestListings(50, 3000);
    md = [
      `# ${UBICA.name}`, '', `> ${UBICA.summary}`, '',
      `Ubica es un servicio de [AMI Fincas](${AMI_ORIGIN}/) (${AMI.company}). Contacto: ${AMI.phone}, ${AMI.email}.`, '',
      '## Secciones', '', ...UBICA.sections.map(([href, t, d]) => `- [${t}](${UBICA_ORIGIN}${href}): ${d}`), '',
      '## Inmuebles publicados', '',
      ...(listings === null ? ['Consulta los inmuebles disponibles en la web.']
        : listings.length ? listings.map(p => `- [${p.title}](${UBICA_ORIGIN}${propertyPath(p)}): ${propertyDescription(p)}`)
        : ['Todavía no hay inmuebles publicados.']), '',
      '## Más', '', `- [Mapa del sitio](${UBICA_ORIGIN}/sitemap.xml)`, `- [Condiciones de uso](${UBICA_ORIGIN}/terms)`, '',
    ].join('\n');
  }
  return new Response(md, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

// ─── robots y sitemap ───────────────────────────────────────────────────────

function robots(host: string): Response {
  let body: string;
  if (!PROD_HOSTS.includes(host)) {
    // Vistas previas de Vercel: que no compitan con la web real en Google
    body = 'User-agent: *\nDisallow: /\n';
  } else {
    const isAmi = host === 'amifincas.es';
    const rules = ['Allow: /', ...(isAmi ? [] : PRIVATE_PATHS.map(p => `Disallow: ${p}`))].join('\n');
    body = [
      'User-agent: *', rules, '',
      '# Buscadores y asistentes de IA: bienvenidos (resumen en /llms.txt)',
      ...AI_BOTS.map(b => `User-agent: ${b}`), rules, '',
      `Sitemap: ${isAmi ? `${AMI_ORIGIN}/sitemap-ami.xml` : `${UBICA_ORIGIN}/sitemap.xml`}`, '',
    ].join('\n');
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
  if (path === '/llms.txt') return llms(host);

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
    jsonLd: !isAmi && path === '/' ? [UBICA_SITE_JSONLD] : isAmi && path === '/' ? [AMI_FAQ_JSONLD] : [],
  };
  // Texto de la página solo en las públicas que existen (no en paneles ni 404)
  if (meta.index && meta.known && parsePropertyId(path) === null) {
    head.body = !isAmi && path === '/'
      ? ubicaHomeBody(await latestListings(12, 1500))
      : pageBody(isAmi, path, meta.title, meta.description);
  }
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
      head.body = propertyBody(p);
    }
    // API dormida o sin respuesta: se sirve la ficha con los datos generales y la app la carga después
  }

  // Las vistas previas de Vercel piden inicio de sesión: la petición interna lleva la del visitante
  const cookie = request.headers.get('cookie');
  const shell = await fetchWithTimeout(new URL(isAmi ? '/ami.html' : '/index.html', url).toString(), 3000, cookie ? { cookie } : {});
  if (!shell?.ok) return next();
  const html = applyHead(await shell.text(), head);
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' },
  });
}
