import { useEffect, useState } from 'react';

/**
 * Instalar Ubica como app.
 * - Android y Chrome/Edge de escritorio avisan con "beforeinstallprompt": se guarda el aviso y el botón lo lanza.
 * - iPhone/iPad no tienen ese aviso: se explica cómo hacerlo con "Compartir → Añadir a pantalla de inicio".
 * - Ya instalada (abierta como app) no se ofrece nada.
 * El aviso puede llegar antes de que React pinte nada, así que se escucha desde que se carga este módulo.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // se ofrece con nuestro botón, no con la barra del navegador
    deferredPrompt = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

// iPadOS se presenta como Mac, pero con pantalla táctil
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useInstallApp() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const update = () => rerender(n => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const standalone = installed || isStandalone();
  const install = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // El aviso solo se puede usar una vez
    deferredPrompt = null;
    notify();
    return outcome === 'accepted';
  };

  return {
    /** El navegador permite instalarla con un toque */
    canPrompt: !standalone && deferredPrompt !== null,
    /** iPhone/iPad sin instalar: hay que explicar los pasos */
    needsIOSHelp: !standalone && deferredPrompt === null && isIOS(),
    install,
  };
}
