import { LanguageIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import type { Language } from '../../types';

const languages = [
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
];

export function LanguageSelector() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = (langCode: Language) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 rounded-lg border border-gray-200 bg-white h-10 px-3 py-2
          shadow-sm transition-all duration-200 hover:bg-gray-50 focus:outline-none
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
        `}
        title={t('language.toggle')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-lg">{currentLang?.flag}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
          {currentLang?.name}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-gray-200
              bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800
            `}
          >
            <div className="py-1">
              {languages.map((language) => (
                <motion.button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    flex w-full items-center space-x-3 px-4 py-2 text-left text-sm transition-colors
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    ${currentLanguage === language.code
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                  {currentLanguage === language.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto h-2 w-2 rounded-full bg-blue-600"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LanguageToggle() {
  const { toggleLanguage, getCurrentLanguageLabel } = useLanguage();

  return (
    <motion.button
      onClick={toggleLanguage}
      className={`
        relative inline-flex h-10 w-10 items-center justify-center rounded-lg
        border border-gray-200 bg-white shadow-sm transition-all duration-200
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
      `}
      title={getCurrentLanguageLabel()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <LanguageIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
    </motion.button>
  );
}
