import { useEffect, useState } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { getPropertyVideo, type PropertyVideo } from '../../utils/propertyVideos';

/**
 * Vídeo del inmueble (si ya está generado) y, para el equipo, el vertical listo para compartir: en el móvil abre el
 * menú Compartir con el vídeo adjunto (WhatsApp, estados, Instagram…); donde no se puede, lo descarga.
 */
export default function PropertyVideoCard({ propertyId, title, canShare, className = '' }: {
  propertyId: number;
  title: string;
  canShare: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const [video, setVideo] = useState<PropertyVideo | null>(null);
  const [state, setState] = useState<'idle' | 'preparing' | 'downloaded' | 'error'>('idle');

  useEffect(() => {
    let alive = true;
    setVideo(null);
    getPropertyVideo(propertyId).then(v => alive && setVideo(v));
    return () => { alive = false; };
  }, [propertyId]);

  if (!video) return null;

  const shareVertical = async () => {
    const name = `ubica-${propertyId}.mp4`;
    setState('preparing');
    try {
      const blob = await fetch(video.vertical).then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      const file = new File([blob], name, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        setState('idle');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState('downloaded');
    } catch (e) {
      // Cerrar el menú Compartir no es un error
      setState(e instanceof DOMException && e.name === 'AbortError' ? 'idle' : 'error');
    }
  };

  return (
    <section aria-labelledby="video-title" className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden ${className}`}>
      <video
        src={video.horizontal}
        poster={video.poster}
        controls
        playsInline
        preload="none"
        className="aspect-video w-full bg-black"
        aria-label={`${t('details.video_title')}: ${title}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 id="video-title" className="font-display text-base font-semibold text-gray-900 dark:text-white">
            {t('details.video_title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('details.video_note')}</p>
        </div>
        {canShare && (
          <button
            type="button"
            onClick={shareVertical}
            disabled={state === 'preparing'}
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5a] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          >
            <ShareIcon className="h-5 w-5" aria-hidden="true" />
            {state === 'preparing' ? t('details.video_preparing') : t('details.video_share')}
          </button>
        )}
      </div>
      {canShare && (
        <p role="status" className="px-4 pb-4 text-sm empty:hidden text-gray-600 dark:text-gray-300">
          {state === 'downloaded' ? t('details.video_downloaded') : state === 'error' ? t('details.video_error') : ''}
        </p>
      )}
    </section>
  );
}
