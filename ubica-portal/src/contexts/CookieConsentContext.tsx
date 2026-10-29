import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Consentimiento de cookies según el banner y la política de AgenciaDatos.
 * Las cookies técnicas no necesitan consentimiento; las analíticas y las publicitarias
 * (entre ellas las que instala Google al mostrar sus mapas) quedan bloqueadas hasta que se acepten.
 */
export interface CookieChoices {
  analytics: boolean;
  ads: boolean;
}

interface StoredConsent extends CookieChoices {
  version: number;
  date: string;
}

interface CookieConsentValue {
  /** null mientras el usuario no ha aceptado, rechazado o guardado una selección */
  consent: CookieChoices | null;
  settingsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (choices: CookieChoices) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = 'ubica-cookie-consent';
const CONSENT_VERSION = 1;
// Avisos anteriores que ya no se usan
const LEGACY_KEYS = ['ubica-storage-notice', 'ami-cookie-consent', 'ami-cookie-consent-date'];

function readConsent(): CookieChoices | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredConsent;
    if (stored.version !== CONSENT_VERSION) return null;
    return { analytics: !!stored.analytics, ads: !!stored.ads };
  } catch {
    return null;
  }
}

function writeConsent(choices: CookieChoices) {
  try {
    const stored: StoredConsent = { ...choices, version: CONSENT_VERSION, date: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento la elección dura solo esta visita */
  }
}

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieChoices | null>(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const save = useCallback((choices: CookieChoices) => {
    writeConsent(choices);
    setConsent(choices);
    setSettingsOpen(false);
  }, []);

  const value = useMemo<CookieConsentValue>(() => ({
    consent,
    settingsOpen,
    acceptAll: () => save({ analytics: true, ads: true }),
    rejectAll: () => save({ analytics: false, ads: false }),
    save,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
  }), [consent, settingsOpen, save]);

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent debe usarse dentro de CookieConsentProvider');
  return ctx;
}
