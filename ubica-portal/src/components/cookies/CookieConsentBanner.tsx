import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, Settings } from 'lucide-react';

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize?: (prefs: { necessary: boolean; analytics: boolean; marketing: boolean; functional: boolean }) => void;
}

export function CookieConsentBanner({ onAcceptAll, onRejectAll, onCustomize }: CookieConsentBannerProps) {
  const [showPersonalizar, setShowPersonalizar] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const [functional, setFunctional] = useState(true);

  const handleSavePreferences = () => {
    const prefs = { necessary: true, analytics, marketing, functional };
    if (onCustomize) {
      onCustomize(prefs);
    } else {
      // Fallback: save to localStorage directly
      localStorage.setItem('ami-cookie-consent', JSON.stringify(prefs));
      localStorage.setItem('ami-cookie-consent-date', new Date().toISOString());
      onRejectAll(); // close the banner
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border-0">
        <div className="p-6 relative">
          <button
            onClick={onRejectAll}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <Shield className="h-8 w-8 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Gestión de Cookies</h3>
              <p className="text-sm text-gray-600">Cumplimiento RGPD - Normativa Europea</p>
            </div>
          </div>

          <p className="text-gray-700 mb-4 leading-relaxed">
            Utilizamos cookies propias y de terceros para mejorar su experiencia de navegación, analizar el tráfico web y personalizar el contenido.
            Al hacer clic en "Aceptar Todas" consiente el uso de todas las cookies. Puede configurar sus preferencias haciendo clic en "Personalizar".
          </p>

          {/* Cookie categories indicators */}
          {!showPersonalizar && (
            <div className="grid grid-cols-4 gap-3 text-sm mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Necesarias (Activas)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Analíticas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-gray-600">Marketing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-gray-600">Funcionales</span>
              </div>
            </div>
          )}

          {/* Personalizar panel */}
          {showPersonalizar && (
            <div className="mb-6 space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Necesarias — always on */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-gray-900">Necesarias</span>
                  <p className="text-xs text-gray-500">Esenciales para el funcionamiento del sitio</p>
                </div>
                <div className="relative inline-flex items-center">
                  <div className="w-10 h-6 bg-emerald-500 rounded-full cursor-not-allowed opacity-80"></div>
                  <div className="absolute left-[18px] top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                  <span className="ml-2 text-xs text-gray-500">Siempre activas</span>
                </div>
              </div>

              {/* Analytics toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200">
                <div>
                  <span className="font-medium text-gray-900">Analíticas</span>
                  <p className="text-xs text-gray-500">Nos ayudan a entender el uso del sitio</p>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${analytics ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${analytics ? 'left-[18px]' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Marketing toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200">
                <div>
                  <span className="font-medium text-gray-900">Marketing</span>
                  <p className="text-xs text-gray-500">Para mostrar contenido relevante</p>
                </div>
                <button
                  onClick={() => setMarketing(!marketing)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${marketing ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${marketing ? 'left-[18px]' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Functional toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200">
                <div>
                  <span className="font-medium text-gray-900">Funcionales</span>
                  <p className="text-xs text-gray-500">Mejoran la experiencia de usuario</p>
                </div>
                <button
                  onClick={() => setFunctional(!functional)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${functional ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${functional ? 'left-[18px]' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3 mb-4">
            {!showPersonalizar ? (
              <>
                <button
                  onClick={onAcceptAll}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-6 py-3 rounded-lg flex-1 font-medium hover:from-emerald-700 hover:to-teal-600 transition-colors"
                >
                  Aceptar Todas las Cookies
                </button>
                <button
                  onClick={onRejectAll}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg flex-1 font-medium transition-colors"
                >
                  Solo Necesarias
                </button>
                <button
                  onClick={() => setShowPersonalizar(true)}
                  className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Personalizar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSavePreferences}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-6 py-3 rounded-lg flex-1 font-medium hover:from-emerald-700 hover:to-teal-600 transition-colors"
                >
                  Guardar Preferencias
                </button>
                <button
                  onClick={() => setShowPersonalizar(false)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg flex-1 font-medium transition-colors"
                >
                  Volver
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Para más información, consulte nuestra{' '}
            <Link to="/privacy" className="text-emerald-600 hover:underline">Política de Privacidad</Link> y{' '}
            <Link to="/politica-cookies" className="text-emerald-600 hover:underline">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  );
}