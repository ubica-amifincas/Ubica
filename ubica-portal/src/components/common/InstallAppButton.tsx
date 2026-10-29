import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useInstallApp } from '../../hooks/useInstallApp';

/**
 * "Instalar app": solo aparece donde se puede instalar y aún no está instalada.
 * variant "bar": botón compacto para la barra superior; "menu": fila ancha del menú del móvil;
 * "item": fila del menú de usuario del panel.
 */
export default function InstallAppButton({ variant = 'bar', className = '', onDone }: {
  variant?: 'bar' | 'menu' | 'item';
  className?: string;
  /** Para cerrar el menú que lo contiene */
  onDone?: () => void;
}) {
  const { canPrompt, needsIOSHelp, install } = useInstallApp();
  const [showHelp, setShowHelp] = useState(false);

  if (!canPrompt && !needsIOSHelp) return null;

  const onClick = async () => {
    if (canPrompt) {
      await install();
      onDone?.();
    } else {
      setShowHelp(true);
    }
  };

  const styles = {
    bar: 'flex h-10 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50',
    menu: 'flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-900/30',
    item: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-gray-50 dark:text-emerald-300 dark:hover:bg-gray-700',
  }[variant];

  return (
    <>
      <button type="button" onClick={onClick} className={`${styles} ${className}`}>
        <ArrowDownTrayIcon className={variant === 'menu' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
        Instalar app
      </button>
      {showHelp && <IOSInstallHelp onClose={() => { setShowHelp(false); onDone?.(); }} />}
    </>
  );
}

/** En iPhone/iPad la instalación se hace desde el menú Compartir de Safari. */
function IOSInstallHelp({ onClose }: { onClose: () => void }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-gray-900/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">Instalar Ubica</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-base text-gray-700 dark:text-gray-300">Tendrás Ubica en la pantalla de inicio, como cualquier otra app:</p>
        <ol className="space-y-3 text-base text-gray-800 dark:text-gray-200">
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">1</span>
            <span>Toca <strong>Compartir</strong> <ArrowUpOnSquareIcon className="inline h-5 w-5 align-text-bottom" aria-label="(el cuadrado con la flecha)" /> en la barra de Safari.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">2</span>
            <span>Elige <strong>Añadir a pantalla de inicio</strong> <PlusIcon className="inline h-5 w-5 align-text-bottom" aria-hidden="true" />.</span>
          </li>
        </ol>
        <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700">
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  );
}
