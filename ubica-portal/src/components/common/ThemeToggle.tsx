import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-10 w-10 items-center justify-center rounded-lg
        border border-gray-200 bg-white shadow-sm transition-all duration-200
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
      `}
      title={t('theme.toggle')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, rotate: -180 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0, rotate: 180 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {theme === 'light' ? (
          <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <SunIcon className="h-5 w-5 text-yellow-500" />
        )}
      </motion.div>
    </motion.button>
  );
}

export function ThemeToggleWithLabel() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-3 py-2
        shadow-sm transition-all duration-200 hover:bg-gray-50 focus:outline-none 
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, rotate: -180 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.3 }}
      >
        {theme === 'light' ? (
          <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <SunIcon className="h-5 w-5 text-yellow-500" />
        )}
      </motion.div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {theme === 'light' ? t('theme.dark') : t('theme.light')}
      </span>
    </motion.button>
  );
}
