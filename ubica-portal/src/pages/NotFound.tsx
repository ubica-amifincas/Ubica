import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg text-center"
      >
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <MagnifyingGlassIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Error 404</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-black text-gray-900 dark:text-white">Página no encontrada</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          La dirección que buscas no existe o se ha movido.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
          >
            <HomeIcon className="h-5 w-5" />
            Volver al inicio
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Contactar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
