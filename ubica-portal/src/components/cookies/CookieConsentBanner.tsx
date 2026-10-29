import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface StorageNoticeProps {
  onDismiss: () => void;
}

/**
 * Aviso informativo de almacenamiento. La web no usa cookies analíticas ni publicitarias,
 * así que no hace falta pedir consentimiento: solo se informa y se enlaza a la política.
 */
export function StorageNotice({ onDismiss }: StorageNoticeProps) {
  return (
    <motion.div
      role="region"
      aria-label="Aviso de almacenamiento"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[10000]"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Solo usamos almacenamiento técnico necesario para que la web funcione (tu sesión y tus preferencias de tema e idioma).
            No usamos cookies analíticas ni publicitarias.{' '}
            <Link to="/politica-cookies" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Más información
            </Link>
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default StorageNotice;
