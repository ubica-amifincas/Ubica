import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import appService from '../../services';
import type { InstagramStatus } from '../../services/apiService';

const CAPTION_MAX = 2200;

/**
 * Publicar el vídeo vertical del inmueble como Reel en @amifincas. Es el paso de aprobación: el equipo revisa (y puede
 * cambiar) el texto propuesto antes de publicar. Solo lo ve el equipo de AMI: para el resto la API responde 403.
 */
export default function InstagramPublish({ propertyId }: { propertyId: number }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = () => appService.getInstagramStatus(propertyId).then(setStatus).catch(() => setStatus(null));

  useEffect(() => {
    setStatus(null);
    setEditing(false);
    load();
  }, [propertyId]);

  // Mientras Instagram procesa el vídeo, se consulta cada 5 s
  const publishing = status?.post?.status === 'publishing';
  useEffect(() => {
    if (!publishing) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [publishing, propertyId]);

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  if (!status) return null;
  const post = status.post;

  if (post?.status === 'published') {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <CameraIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
        {t('details.ig_published')}
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300">
            {t('details.ig_view')}
          </a>
        )}
      </p>
    );
  }

  if (publishing) {
    return <p role="status" className="text-sm text-gray-700 dark:text-gray-200">{t('details.ig_publishing')}</p>;
  }

  const blocked = !status.configured ? t('details.ig_not_connected')
    : !status.publishable ? t('details.ig_not_publishable')
    : status.video === 'missing' ? t('details.ig_video_missing')
    : status.video === 'outdated' ? t('details.ig_video_outdated')
    : '';

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const created = await appService.publishInstagram(propertyId, caption);
      setStatus(s => (s ? { ...s, post: created } : s));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={publish} className="space-y-2">
        <label htmlFor="ig-caption" className="block text-sm font-medium text-gray-900 dark:text-white">
          {t('details.ig_review')}
        </label>
        <textarea
          id="ig-caption"
          ref={textRef}
          rows={10}
          maxLength={CAPTION_MAX}
          required
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">{caption.length} / {CAPTION_MAX}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
              {t('details.ig_cancel')}
            </button>
            <button type="submit" disabled={sending || !caption.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {sending ? t('details.ig_sending') : t('details.ig_publish_now')}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { setCaption(status.caption); setError(''); setEditing(true); }}
        disabled={!!blocked}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <CameraIcon className="h-5 w-5" aria-hidden="true" />
        {post?.status === 'error' ? t('details.ig_retry') : t('details.ig_publish')}
      </button>
      {post?.status === 'error' && !blocked && (
        <p className="text-sm text-red-700 dark:text-red-300">{t('details.ig_error', { error: post.error ?? '' })}</p>
      )}
      {blocked && <p className="text-sm text-gray-500 dark:text-gray-400">{blocked}</p>}
    </div>
  );
}
