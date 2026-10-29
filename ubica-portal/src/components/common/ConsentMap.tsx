import { useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

interface ConsentMapProps {
  src: string;
  title: string;
  /** Dirección para el enlace "Abrir en Google Maps", que no instala cookies en esta web */
  address: string;
  className?: string;
}

/**
 * Mapa de Google que solo se carga con las cookies publicitarias aceptadas, porque Google las instala al mostrarlo.
 * Mientras tanto se ofrece aceptarlas o abrir la dirección en Google Maps.
 */
export default function ConsentMap({ src, title, address, className = '' }: ConsentMapProps) {
  const { consent, save, openSettings } = useCookieConsent();
  const [loaded, setLoaded] = useState(false);
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  if (!consent?.ads) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-gray-800 p-6 text-center ${className}`}>
        <MapPinIcon className="h-8 w-8 text-emerald-700 dark:text-emerald-400" />
        <p className="max-w-sm text-sm text-gray-700 dark:text-gray-300">
          Este mapa lo muestra Google, que instala cookies publicitarias. Para verlo aquí, acepta las cookies publicitarias.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => save({ analytics: consent?.analytics ?? false, ads: true })}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Aceptar y ver el mapa
          </button>
          <button type="button" onClick={openSettings} className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100">
            Configurar cookies
          </button>
        </div>
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-700 dark:text-emerald-400 underline">
          Abrir {address} en Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-sm text-gray-500">Cargando mapa…</span>
        </div>
      )}
      <iframe
        title={title}
        src={src}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
