import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCookieConsent, type CookieChoices } from '../../contexts/CookieConsentContext';

const buttonBase = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800';
const primary = `${buttonBase} bg-emerald-700 hover:bg-emerald-800 text-white`;
const secondary = `${buttonBase} border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700`;

/** Banner de primera capa (texto de AgenciaDatos). Permanece visible hasta que se acepta, rechaza o guarda una selección. */
function CookieBanner() {
  const { acceptAll, rejectAll, openSettings } = useCookieConsent();
  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[10000] px-4 pb-4 sm:pb-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
        <h2 className="text-sm font-bold tracking-wide text-gray-900 dark:text-white">COOKIES</h2>
        <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Utilizamos cookies propias y de terceros para analizar nuestros servicios y mostrarle publicidad relacionada con sus
            preferencias en base a un perfil elaborado a partir de sus hábitos de navegación (por ejemplo, páginas visitadas).
          </p>
          <p>
            Para más información consulte la{' '}
            <Link to="/politica-cookies" className="font-semibold text-emerald-700 dark:text-emerald-400 underline">política de cookies</Link>.
          </p>
          <p>
            Puede aceptar todas las cookies pulsando el botón "Aceptar", rechazar su uso pulsando el botón "Rechazar" y
            configurarlas pulsando el botón "Configurar".
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={acceptAll} className={primary}>Aceptar</button>
          <button type="button" onClick={rejectAll} className={secondary}>Rechazar</button>
          <button type="button" onClick={openSettings} className={secondary}>Configurar</button>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES: { key: keyof CookieChoices; title: string; text: string }[] = [
  {
    key: 'analytics',
    title: 'Cookies analíticas',
    text: 'Permiten el seguimiento y análisis del comportamiento de los usuarios para medir la actividad del sitio web e introducir mejoras.',
  },
  {
    key: 'ads',
    title: 'Cookies publicitarias',
    text: 'Permiten gestionar los espacios publicitarios y mostrar publicidad según sus preferencias. Incluyen las cookies de Google que se instalan al mostrar los mapas de Google Maps.',
  },
];

/** Panel de configuración: casillas sin marcar por defecto; guardar sin marcar ninguna equivale a rechazarlas. */
function CookieSettingsPanel() {
  const { consent, save, acceptAll, rejectAll, closeSettings } = useCookieConsent();
  const [choices, setChoices] = useState<CookieChoices>(consent ?? { analytics: false, ads: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSettings(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSettings]);

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 id="cookie-settings-title" className="text-lg font-bold text-gray-900 dark:text-white">Panel de configuración de cookies</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Desde este panel podrá configurar las cookies que el sitio web puede instalar en su navegador, excepto las cookies técnicas o
          funcionales que son necesarias para la navegación y la utilización de las diferentes opciones o servicios que se ofrecen.
        </p>

        <ul className="mt-5 space-y-3">
          <li className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-gray-900 dark:text-white">Cookies técnicas y funcionales</span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Siempre activas</span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Necesarias para navegar por la web y usar sus opciones, como mantener la sesión iniciada.</p>
          </li>
          {CATEGORIES.map(cat => (
            <li key={cat.key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <label htmlFor={`cookie-${cat.key}`} className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="font-semibold text-gray-900 dark:text-white">{cat.title}</span>
                <input
                  id={`cookie-${cat.key}`}
                  type="checkbox"
                  checked={choices[cat.key]}
                  onChange={e => setChoices(c => ({ ...c, [cat.key]: e.target.checked }))}
                  className="h-5 w-5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
                />
              </label>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{cat.text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Si guarda sin seleccionar ninguna categoría, equivaldrá a rechazar todas las cookies. Puede cambiar su elección en cualquier
          momento desde «Configurar cookies», en el pie de página. Más información en la{' '}
          <Link to="/politica-cookies" onClick={closeSettings} className="underline">política de cookies</Link>.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={rejectAll} className={secondary}>Rechazar todas</button>
          <button type="button" onClick={acceptAll} className={secondary}>Aceptar todas</button>
          <button type="button" onClick={() => save(choices)} className={primary}>Guardar selección</button>
        </div>
      </div>
    </div>
  );
}

/** Banner mientras no haya decisión y panel de configuración cuando se abre (desde el banner o el pie de página). */
export default function CookieConsent() {
  const { consent, settingsOpen } = useCookieConsent();
  if (settingsOpen) return <CookieSettingsPanel />;
  if (consent === null) return <CookieBanner />;
  return null;
}
