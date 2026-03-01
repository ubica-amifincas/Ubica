import { useState, useEffect } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface UseCookieConsentReturn {
  showBanner: boolean;
  preferences: CookiePreferences | null;
  acceptAll: () => void;
  rejectAll: () => void;
  updatePreferences: (prefs: CookiePreferences) => void;
}

export function useCookieConsent(): UseCookieConsentReturn {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const storedConsent = localStorage.getItem('ami-cookie-consent');
    const consentDate = localStorage.getItem('ami-cookie-consent-date');
    
    if (storedConsent && consentDate) {
      // Verificar si el consentimiento ha expirado (6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const storedDate = new Date(consentDate);
      
      if (storedDate > sixMonthsAgo) {
        try {
          const parsedPreferences = JSON.parse(storedConsent);
          setPreferences(parsedPreferences);
          setShowBanner(false);
        } catch (error) {
          console.error('Error parsing stored cookie consent:', error);
          setShowBanner(true);
        }
      } else {
        // Consentimiento expirado
        localStorage.removeItem('ami-cookie-consent');
        localStorage.removeItem('ami-cookie-consent-date');
        setShowBanner(true);
      }
    } else {
      // No hay consentimiento guardado
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem('ami-cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('ami-cookie-consent-date', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);
  };

  const acceptAll = () => {
    const fullConsent: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    saveConsent(fullConsent);
  };

  const rejectAll = () => {
    const minimalConsent: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    saveConsent(minimalConsent);
  };

  const updatePreferences = (prefs: CookiePreferences) => {
    saveConsent(prefs);
  };

  return {
    showBanner,
    preferences,
    acceptAll,
    rejectAll,
    updatePreferences
  };
}