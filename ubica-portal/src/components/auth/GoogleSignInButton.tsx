import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiService, type LoginResponse } from '../../services/apiService';
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
  /** Tipo de cuenta que se propone si el correo es nuevo (el del formulario de registro). */
  role?: string;
  onSuccess: (user: User) => void;
  onError: (message: string) => void;
}

const SIGNUP_ROLES = ['user', 'investor', 'realtor'] as const;

/**
 * Botón oficial de Google. Solo aparece si el backend tiene GOOGLE_CLIENT_ID; Google devuelve un
 * ID token que el backend verifica antes de abrir sesión. Si el correo no tiene cuenta, no se crea
 * nada hasta que la persona elige el tipo de cuenta y acepta las condiciones (se reenvía el mismo token).
 */
export default function GoogleSignInButton({ mode = 'signin', role, onSuccess, onError }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState<{ credential: string; email: string; name?: string } | null>(null);
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

  const finish = (data: LoginResponse) => {
    const user = data.user as User;
    latest.current.setSession(data.access_token, user);
    latest.current.onSuccess(user);
  };

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
              const data = await apiService.loginWithGoogle(credential);
              if ('needs_signup' in data) {
                setSignup({ credential, email: data.email, name: data.full_name });
                return;
              }
              finish(data);
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
      {signup && (
        <CompleteGoogleSignup
          {...signup}
          defaultRole={role}
          onCancel={() => setSignup(null)}
          onDone={(data) => { setSignup(null); finish(data); }}
        />
      )}
    </div>
  );
}

/** Último paso del registro con Google: tipo de cuenta y aceptación de condiciones y privacidad. */
function CompleteGoogleSignup({ credential, email, name, defaultRole, onCancel, onDone }: {
  credential: string; email: string; name?: string; defaultRole?: string;
  onCancel: () => void; onDone: (data: LoginResponse) => void;
}) {
  const { t } = useLanguage();
  const [role, setRole] = useState(SIGNUP_ROLES.includes(defaultRole as typeof SIGNUP_ROLES[number]) ? defaultRole! : 'user');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError('Para crear la cuenta tienes que aceptar las condiciones y la política de privacidad.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await apiService.loginWithGoogle(credential, { role, acceptTerms: true });
      if ('needs_signup' in data) throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');
      onDone(data);
    } catch (err) {
      // El token de Google dura una hora: si caducó, hay que volver a pulsar el botón
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
      setSaving(false);
    }
  };

  const hints: Record<string, string> = {
    user: 'Buscar vivienda, guardar favoritos y anunciar tu inmueble.',
    investor: 'Lo anterior y herramientas para analizar inversiones.',
    realtor: 'Para agencias. Revisaremos tu cuenta antes de que publiques sin revisión.',
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/50 p-4" onClick={() => !saving && onCancel()}>
      <form role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div>
          <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">Completa tu registro</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {name ? `${name}, ` : ''}vas a crear una cuenta en Ubica con <strong className="break-all">{email}</strong>.
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Tipo de cuenta</legend>
          <div className="space-y-2">
            {SIGNUP_ROLES.map((value, i) => (
              <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${role === value
                ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/20'
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'}`}>
                <input type="radio" name="google-role" value={value} checked={role === value} onChange={() => setRole(value)}
                  autoFocus={i === 0} className="mt-1 text-emerald-600 focus:ring-emerald-500" />
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t(`roles.${value}`)}</span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400">{hints[value]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
          <span>
            He leído y acepto las <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-emerald-700 underline dark:text-emerald-400">condiciones de uso</a>{' '}
            y la <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-emerald-700 underline dark:text-emerald-400">política de privacidad</a>.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
