/**
 * Lo que se ha compartido con Ubica desde otra app (fotos y texto de WhatsApp): el service worker (public/sw.js)
 * lo guarda en la caché «ubica-share» y «Subir inmueble» lo recoge aquí, una sola vez.
 */

const SHARE_CACHE = 'ubica-share';
// Si se compartió y no se llegó a abrir «Subir inmueble» (p. ej. faltaba iniciar sesión), una hora después ya no vale
const MAX_AGE_MS = 60 * 60 * 1000;

interface ShareMeta {
  files: { key: string; name: string; type: string }[];
  text: string;
  at: number;
}

export async function takeShared(): Promise<{ files: File[]; text: string } | null> {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const metaResponse = await cache.match('/__share/meta');
    if (!metaResponse) return null;
    const meta = (await metaResponse.json()) as ShareMeta;
    const files: File[] = [];
    for (const f of meta.files) {
      const response = await cache.match(f.key);
      if (response) files.push(new File([await response.blob()], f.name, { type: f.type }));
    }
    await caches.delete(SHARE_CACHE);
    if (Date.now() - meta.at > MAX_AGE_MS) return null;
    return files.length || meta.text ? { files, text: meta.text } : null;
  } catch {
    return null;
  }
}
