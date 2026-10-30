// Prueba del middleware de Vercel con fetch simulado (API y HTML locales). Uso: npm run test:middleware (Node 22.6+ por los .ts)
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\/]$/, '');
const property = {
  id: 5, title: 'Piso luminoso en Murcia', price: 185000, type: 'flat', status: 'for-sale', region: 'Murcia',
  bedrooms: 3, bathrooms: 2, area: 95, address: 'Calle Mayor 12', city: 'Murcia',
  description: 'Piso exterior con terraza </script><b>y garaje</b>.', images: ['https://cdn.example/p5.jpg'],
  latitude: 37.98, longitude: -1.13, created_at: '2026-10-01T10:00:00', updated_at: '2026-10-20T10:00:00',
};
let apiMode = 'ok';
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.endsWith('/index.html')) return new Response(fs.readFileSync(`${ROOT}/index.html`, 'utf8'));
  if (url.endsWith('/ami.html')) return new Response(fs.readFileSync(`${ROOT}/ami.html`, 'utf8'));
  if (apiMode === 'hang') return new Promise((_, reject) => setTimeout(() => reject(new Error('abort')), 2600));
  if (url.endsWith('/properties/5')) return Response.json(property);
  if (/\/properties\/\d+$/.test(url)) return new Response('{}', { status: 404 });
  if (url.includes('/properties?')) {
    // Como la API real: como mucho 100 por petición
    const q = new URL(url).searchParams, limit = Number(q.get('limit') || 20), skip = Number(q.get('skip') || 0);
    if (limit > 100) return Response.json({ detail: 'limit <= 100' }, { status: 422 });
    const all = apiMode === 'many' ? Array.from({ length: 150 }, (_, i) => ({ ...property, id: 1000 + i })) : [property];
    return Response.json(all.slice(skip, skip + limit));
  }
  throw new Error('fetch inesperado ' + url);
};

const { default: middleware, resetApiCache } = await import(new URL('../middleware.ts', import.meta.url).href);
const go = (u) => middleware(new Request(u));
const html = async (r) => r.text();
const title = (h) => /<title>([^<]*)<\/title>/.exec(h)[1];
const canonical = (h) => /<link rel="canonical" href="([^"]*)"/.exec(h)[1];
const meta = (h, k) => new RegExp(`<meta (?:name|property)="${k}" content="([^"]*)"`).exec(h)?.[1];
const ok = (m) => console.log('  ✓', m);

// Portada de Ubica
let r = await go('https://ubica.amifincas.es/'); let h = await html(r);
assert.equal(r.status, 200); assert.equal(title(h), 'Ubica - Portal inmobiliario'); assert.equal(canonical(h), 'https://ubica.amifincas.es/');
assert.ok(h.includes('"@type":"WebSite"') && !meta(h, 'robots')); assert.equal(meta(h, 'og:image'), 'https://ubica.amifincas.es/og-ubica.jpg');
ok('portada de Ubica: título, canónica, WebSite, imagen para redes');

r = await go('https://ubica.amifincas.es/about'); h = await html(r);
assert.equal(title(h), 'Sobre nosotros | Ubica'); assert.equal(canonical(h), 'https://ubica.amifincas.es/about'); ok('/about con su título y canónica');

// Fichas
r = await go('https://ubica.amifincas.es/property/5');
assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia'); ok('/property/5 → 301 a la dirección legible');
r = await go('https://ubica.amifincas.es/inmueble/5-otro-titulo');
assert.equal(r.status, 301); ok('slug viejo → 301 al bueno');
r = await go('https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia'); h = await html(r);
assert.equal(r.status, 200); assert.equal(title(h), 'Piso luminoso en Murcia | Ubica');
assert.equal(canonical(h), 'https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia');
assert.equal(meta(h, 'og:image'), 'https://cdn.example/p5.jpg'); assert.ok(!h.includes('og:image:width'));
assert.ok(meta(h, 'description').startsWith('Piso en venta en Murcia: 185.000'), meta(h, 'description'));
assert.ok(h.includes('"@type":"RealEstateListing"') && h.includes('"price":185000') && h.includes('"addressRegion":"Murcia"'));
assert.ok(!h.includes('</script><b>') && h.includes('\\u003c/script>'), 'JSON-LD escapa </script>');
assert.ok(!/<meta name="description" content="[^"]*<b>/.test(h), 'descripción escapada');
ok('ficha: título, descripción, foto, sin medidas fijas, RealEstateListing escapado');
r = await go('https://ubica.amifincas.es/inmueble/999'); h = await html(r);
assert.equal(r.status, 404); assert.equal(meta(h, 'robots'), 'noindex, follow'); ok('inmueble inexistente → 404 noindex');

apiMode = 'hang'; resetApiCache(); const t0 = Date.now();
r = await go('https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia'); h = await html(r);
assert.equal(r.status, 200); assert.ok(Date.now() - t0 < 3500); assert.equal(title(h), 'Inmueble | Ubica');
ok(`API dormida: se sirve la ficha igualmente en ${Date.now() - t0} ms`); apiMode = 'ok'; resetApiCache();

r = await go('https://ubica.amifincas.es/no-existe'); h = await html(r);
assert.equal(r.status, 404); assert.equal(meta(h, 'robots'), 'noindex, follow'); ok('ruta desconocida → 404');
r = await go('https://ubica.amifincas.es/dashboard/properties'); h = await html(r);
assert.equal(r.status, 200); assert.equal(meta(h, 'robots'), 'noindex, follow'); ok('panel → noindex');
r = await go('https://ubica.amifincas.es/escaparate?segundos=10'); h = await html(r);
assert.equal(r.status, 200); assert.equal(meta(h, 'robots'), 'noindex, follow'); assert.equal(title(h), 'Escaparate | AMI Fincas · Ubica');
assert.ok(!h.includes('<main data-static>')); ok('escaparate de la oficina → noindex, sin texto');

// AMI Fincas
r = await go('https://amifincas.es/'); h = await html(r);
assert.equal(title(h), 'AMI Fincas | Administración de fincas en Murcia y Alicante'); assert.equal(canonical(h), 'https://amifincas.es/');
assert.ok(h.includes('ProfessionalService')); ok('portada de AMI desde ami.html');
r = await go('https://amifincas.es/aviso-legal'); h = await html(r);
assert.equal(title(h), 'Aviso legal | AMI Fincas'); assert.equal(canonical(h), 'https://amifincas.es/aviso-legal'); ok('aviso legal de AMI con su marca');
r = await go('https://amifincas.es/about?x=1');
assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://ubica.amifincas.es/about?x=1'); ok('amifincas.es/about → 301 a Ubica');
r = await go('https://www.amifincas.es/'); assert.equal(r.headers.get('x-middleware-next'), '1'); ok('www lo redirige vercel.json');
r = await go('https://ubica.amifincas.es/mcp'); assert.equal(r.headers.get('x-middleware-next'), '1'); ok('/mcp pasa al backend (vercel.json)');

// robots y sitemap
assert.ok((await (await go('https://ubica.amifincas.es/robots.txt')).text()).includes('Sitemap: https://ubica.amifincas.es/sitemap.xml'));
assert.ok((await (await go('https://amifincas.es/robots.txt')).text()).includes('sitemap-ami.xml'));
assert.equal(await (await go('https://ubica-git-develop-x.vercel.app/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
h = await html(await go('https://ubica-git-develop-x.vercel.app/about')); assert.equal(meta(h, 'robots'), 'noindex, follow');
ok('robots por dominio; vistas previas fuera de Google');
const sm = await (await go('https://ubica.amifincas.es/sitemap.xml')).text();
assert.ok(sm.includes('<loc>https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia</loc><lastmod>2026-10-20</lastmod>') && sm.includes('/aviso-legal'));
ok('sitemap con páginas fijas e inmuebles');
apiMode = 'many'; resetApiCache();
const many = await (await go('https://ubica.amifincas.es/sitemap.xml')).text();
assert.ok(many.includes('/inmueble/1000-') && many.includes('/inmueble/1149-')); apiMode = 'ok'; resetApiCache();
ok('sitemap con más de 100 inmuebles (por páginas)');
const sa = await (await go('https://amifincas.es/sitemap-ami.xml')).text();
assert.ok(sa.includes('<loc>https://amifincas.es/</loc>') && sa.includes('<loc>https://amifincas.es/politica-cookies</loc>') && !sa.includes('ubica.'));
assert.equal(await (await go('https://amifincas.es/sitemap.xml')).text(), sa);
ok('sitemap de AMI con portada y páginas legales, también en /sitemap.xml');
// Buscadores de IA: texto sin JavaScript, FAQ, robots y llms.txt
const visible = (h) => (/<main data-static>([\s\S]*?)<\/main>/.exec(h)?.[1] || '').replace(/<[^>]+>/g, ' ');
h = await html(await go('https://amifincas.es/'));
assert.ok(visible(h).includes('Calle Ángeles, 41') && visible(h).includes('¿Cómo se cambia de administrador?') && visible(h).includes('676 62 69 33'));
assert.ok(h.includes('"@type":"FAQPage"')); ok('portada de AMI: servicios, sedes y FAQ en texto + FAQPage');
h = await html(await go('https://ubica.amifincas.es/'));
assert.ok(h.includes('<a href="/inmueble/5-piso-luminoso-en-murcia">Piso luminoso en Murcia</a>')); ok('portada de Ubica: inmuebles enlazados en texto');
h = await html(await go('https://ubica.amifincas.es/inmueble/5-piso-luminoso-en-murcia'));
assert.ok(visible(h).includes('Habitaciones: 3') && visible(h).includes('Calle Mayor 12, Murcia') && !h.includes('<b>y garaje')); ok('ficha en texto, escapada');
h = await html(await go('https://ubica.amifincas.es/dashboard'));
assert.ok(!h.includes('<main data-static>')); ok('paneles sin texto');
const rb = await (await go('https://ubica.amifincas.es/robots.txt')).text();
assert.ok(/User-agent: GPTBot[\s\S]*Disallow: \/dashboard/.test(rb) && rb.includes('User-agent: ClaudeBot')); ok('robots: grupo de IA con las mismas exclusiones');
assert.ok(rb.includes('Disallow: /escaparate')); ok('robots: el escaparate no se rastrea');
const la = await (await go('https://amifincas.es/llms.txt')).text();
const lu = await (await go('https://ubica.amifincas.es/llms.txt')).text();
assert.ok(la.startsWith('# AMI Fincas') && la.includes('## Preguntas frecuentes') && lu.startsWith('# Ubica') && lu.includes('/inmueble/5-piso-luminoso-en-murcia'));
assert.ok(lu.includes('https://ubica.amifincas.es/mcp') && !la.includes('/mcp'));
ok('llms.txt en las dos webs');
console.log('TODO OK');
// Títulos con "$`" o "$'": con un texto de reemplazo copiaban trozos del HTML en el <title>
{
  const { applyHead } = await import(new URL('../middleware.ts', import.meta.url).href);
  const shell = '<html><head><title>x</title><link rel="canonical" href="/" /></head><body><div id="root"></div></body></html>';
  const out = applyHead(shell, { title: "Piso $` raro $'", description: "d $&", url: 'https://ubica.amifincas.es/x', image: 'https://i', index: true, jsonLd: [{ a: "$'" }] });
  assert.ok(out.includes("<title>Piso $` raro $'</title>") && out.includes('content="d $&amp;"') && out.split('<html>').length === 2);
  console.log('  ✓ títulos con $ no rompen el HTML');
}
