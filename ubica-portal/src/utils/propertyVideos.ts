/**
 * Vídeos de los inmuebles, generados cada hora a partir de sus fotos (scripts/property-videos). El índice público
 * dice qué vídeo tiene cada inmueble; un inmueble recién subido no aparece hasta la siguiente ejecución.
 */
const INDEX_URL = import.meta.env.VITE_VIDEO_INDEX_URL
  || 'https://iklqjuiodvmeynbcimwq.supabase.co/storage/v1/object/public/property-videos/index.json';

export interface PropertyVideo {
  /** 1280×720, para la ficha */
  horizontal: string;
  /** 720×1280, para estados de WhatsApp y redes */
  vertical: string;
  poster?: string;
}

let index: Promise<Record<string, PropertyVideo>> | null = null;

export function getPropertyVideo(id: number | string): Promise<PropertyVideo | null> {
  index ??= fetch(INDEX_URL)
    .then(r => (r.ok ? r.json() : {}))
    .then((data: { videos?: Record<string, PropertyVideo> }) => data?.videos ?? {})
    .catch(() => {
      index = null; // sin vídeos esta vez; se reintenta en la siguiente ficha
      return {};
    });
  return index.then(videos => videos[String(id)] ?? null);
}
