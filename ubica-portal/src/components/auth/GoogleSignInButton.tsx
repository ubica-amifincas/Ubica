import { useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth, type User } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

/** Lo mínimo de Google Identity Services que usamos (https://developers.google.com/identity/gsi/web). */
interface GoogleId {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Una sola petición por visita: el Client ID y el script de Google
let clientIdPromise: Promise<string | null> | null = null;
let scriptPromise: Promise<void> | null = null;

const getClientId = () => {
  clientIdPromise ??= apiService.getGoogleConfig().then(c => c.client_id).catch(() => null);
  return clientIdPromise;
};

const loadScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('No se pudo cargar Google'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

interface Props {
  /** signin: "Continuar con Google"; signup: "Registrarse con Google". */
  mode?: 'signin' | 'signup';
  /** Rol de la cuenta si es nueva (solo en el registro). */
  role?: string;
  onSuccess: (user: User) => void;
  onError: (message: string) => void;
}

/**
 * Botón oficial de Google. Solo aparece si el backend tiene GOOGLE_CLIENT_ID; Google devuelve un
 * ID token que el backend verifica antes de abrir sesión (o crear la cuenta).
 */
export default function GoogleSignInButton({ mode = 'signin', role, onSuccess, onError }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setSession } = useAuth();
  const { theme } = useTheme();
  const { currentLanguage, t } = useLanguage();

  // El rol y los callbacks pueden cambiar después de inicializar Google: se leen siempre del último render
  const latest = useRef({ role, onSuccess, onError, setSession });
  latest.current = { role, onSuccess, onError, setSession };

  useEffect(() => {
    let cancelled = false;
    getClientId().then(id => { if (!cancelled) setClientId(id); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        const container = containerRef.current;
        const gid = window.google?.accounts.id;
        if (cancelled || !container || !gid) return;
        gid.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          context: mode === 'signup' ? 'signup' : 'signin',
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) return;
            setBusy(true);
            try {
              const data = await apiService.loginWithGoogle(credential, latest.current.role);
              const user = data.user as User;
              latest.current.setSession(data.access_token, user);
              latest.current.onSuccess(user);
            } catch (err) {
              latest.current.onError(err instanceof Error ? err.message : 'No se pudo entrar con Google');
            } finally {
              setBusy(false);
            }
          },
        });
        container.innerHTML = '';
        gid.renderButton(container, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, Math.round(container.getBoundingClientRect().width))),
          locale: currentLanguage,
        });
      })
      .catch(() => { /* sin Google (bloqueado o sin conexión): queda el formulario normal */ });
    return () => { cancelled = true; };
  }, [clientId, mode, theme, currentLanguage]);

  if (!clientId) return null;

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        {t('auth.or', 'o')}
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div ref={containerRef} className={`flex min-h-[44px] justify-center ${busy ? 'pointer-events-none opacity-60' : ''}`} />
    </div>
  );
}
