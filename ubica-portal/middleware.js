/**
 * Middleware de Vercel: la raíz de amifincas.es es la web de AMI Fincas. Se sirve ami.html (la misma app
 * con la cabecera de AMI para buscadores y redes); una regla de vercel.json no basta porque el index.html
 * de Ubica, al existir como archivo, tiene prioridad sobre las reescrituras.
 */
export const config = { matcher: '/' };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname === 'amifincas.es') {
    return new Response(null, { headers: { 'x-middleware-rewrite': new URL('/ami.html', url).toString() } });
  }
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}
