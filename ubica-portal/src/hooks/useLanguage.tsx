import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

type Language = 'es' | 'en';

export function useLanguage() {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language as Language;

  const changeLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('ubica-language', lang);
  }, [i18n]);

  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'es' ? 'en' : 'es';
    changeLanguage(newLang);
  }, [currentLanguage, changeLanguage]);

  const getLanguageLabel = (lang: Language) => {
    return lang === 'es' ? 'Español' : 'English';
  };

  const getCurrentLanguageLabel = () => {
    return getLanguageLabel(currentLanguage);
  };

  const isSpanish = currentLanguage === 'es';
  const isEnglish = currentLanguage === 'en';

  return {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    getLanguageLabel,
    getCurrentLanguageLabel,
    isSpanish,
    isEnglish,
    t
  };
}
