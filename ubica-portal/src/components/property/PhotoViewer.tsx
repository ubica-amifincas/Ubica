import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Mantiene a la vista la miniatura de la foto activa: desplaza solo la tira (no la página) hasta centrarla.
 * Las miniaturas son los hijos directos de la tira, en el mismo orden que las fotos.
 */
export function useFollowThumb(stripRef: RefObject<HTMLElement>, index: number, enabled = true) {
  const first = useRef(true);
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!enabled || !strip || !thumb) return;
    const box = strip.getBoundingClientRect();
    const rect = thumb.getBoundingClientRect();
    const left = strip.scrollLeft + rect.left - box.left - (strip.clientWidth - rect.width) / 2;
    // Al abrir, sin animación; al cambiar de foto, suave (salvo si el visitante prefiere menos movimiento)
    const smooth = !first.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    first.current = false;
  }, [stripRef, index, enabled]);
}

interface PhotoViewerProps {
  images: string[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Fotos a pantalla completa: flechas, teclado (← → Esc), deslizar en el móvil y miniaturas abajo. */
export default function PhotoViewer({ images, index, title, onIndexChange, onClose }: PhotoViewerProps) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  const go = (step: number) => onIndexChange((index + step + count) % count);

  useFollowThumb(stripRef, index);

  // Teclado, página quieta detrás y foco: al cerrar vuelve a donde estaba
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
      else if (e.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onClose, onIndexChange]);

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || count < 2) return;
    const distance = touchX.current - e.changedTouches[0].clientX;
    touchX.current = null;
    if (Math.abs(distance) > 50) go(distance > 0 ? 1 : -1);
  };

  const arrowClass = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

  // En el body y por encima de todo (el mapa de Leaflet y el aviso de instalar la app tienen z-index altos)
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[10001] flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-medium">{title}</p>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-white/80">{index + 1} / {count}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('details.photo_close')}
            className="rounded-full p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* La foto ocupa todo el hueco (también las pequeñas) sin recortarse */}
      <div className="relative min-h-0 flex-1"
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd}>
        <img key={index} src={images[index]} alt={t('details.photo_n', { n: index + 1 })}
          className="absolute inset-0 h-full w-full object-contain" />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t('details.photo_prev')} className={`${arrowClass} left-3 sm:left-6`}>
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t('details.photo_next')} className={`${arrowClass} right-3 sm:right-6`}>
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={stripRef} className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:thin]">
          {images.map((img, i) => (
            <button key={img + i} type="button" onClick={() => onIndexChange(i)}
              aria-label={t('details.photo_n', { n: i + 1 })} aria-current={i === index}
              className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-16 sm:w-24 ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
