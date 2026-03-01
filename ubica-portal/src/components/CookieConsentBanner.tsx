import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, Settings } from 'lucide-react';

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function CookieConsentBanner({ onAcceptAll, onRejectAll }: CookieConsentBannerProps) {
  const [showPersonalizar, setShowPersonalizar] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border-0">
        <div className="p-6 relative">
          <button 
            onClick={onRejectAll}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Gestión de Cookies</h3>
              <p className="text-sm text-gray-600">Cumplimiento RGPD - Normativa Europea</p>
            </div>
          </div>
          
          <p className="text-gray-700 mb-4 leading-relaxed">
            Utilizamos cookies propias y de terceros para mejorar su experiencia de navegación, analizar el tráfico web y personalizar el contenido. 
            Al hacer clic en "Aceptar Todas" consiente el uso de todas las cookies. Puede configurar sus preferencias haciendo clic en "Personalizar".
          </p>
          
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
          
          <div className="flex space-x-3 mb-4">
            <button 
              onClick={onAcceptAll}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg flex-1 font-medium transition-colors"
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
              className="border border-blue-300 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <Settings className="h-4 w-4" />
              Personalizar
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Para más información, consulte nuestra{' '}
            <Link to="/politica-privacidad" className="text-blue-600 hover:underline">Política de Privacidad</Link> y{' '}
            <Link to="/politica-cookies" className="text-blue-600 hover:underline">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  );
}