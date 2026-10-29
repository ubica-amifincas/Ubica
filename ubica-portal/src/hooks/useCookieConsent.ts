import { useState } from 'react';

/** Clave en localStorage que recuerda que el usuario ya ha visto el aviso de almacenamiento. */
export const STORAGE_NOTICE_KEY = 'ubica-storage-notice';

// Claves del antiguo banner de consentimiento (ya no se usan)
const LEGACY_KEYS = ['ami-cookie-consent', 'ami-cookie-consent-date'];

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_NOTICE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Estado del aviso informativo de almacenamiento (no es un gestor de consentimiento). */
export function useStorageNotice() {
  const [showNotice, setShowNotice] = useState(() => !readDismissed());

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_NOTICE_KEY, new Date().toISOString());
      LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
    } catch {
      /* almacenamiento no disponible: se ocultará solo en esta visita */
    }
    setShowNotice(false);
  };

  return { showNotice, dismiss };
}
