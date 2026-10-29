import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Tarjeta centrada usada por las páginas de recuperación de contraseña y confirmación de correo. */
const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700"
    >
      <Link to="/" className="mx-auto flex justify-center mb-6">
        <img src="/logo_ubica.png" alt="Ubica" className="h-16 object-contain" />
      </Link>
      <h1 className="text-center text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{title}</h1>
      {subtitle && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </motion.div>
  </div>
);

export const authInputClass =
  'block w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0 focus:bg-white dark:focus:bg-gray-700';

export const authLabelClass =
  'block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1';

export const authButtonClass =
  'w-full h-14 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 tracking-wider uppercase text-sm';

export const AuthAlert: React.FC<{ type: 'success' | 'error' | 'info'; children: React.ReactNode }> = ({ type, children }) => {
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    info: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  }[type];
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`border px-4 py-3 rounded-xl text-sm ${styles}`}>
      {children}
    </div>
  );
};

export const ResultIcon: React.FC<{ ok: boolean }> = ({ ok }) => (
  <div className="mx-auto flex justify-center">
    <div className={`h-16 w-16 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
      {ok
        ? <CheckIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        : <XMarkIcon className="h-8 w-8 text-red-600 dark:text-red-400" />}
    </div>
  </div>
);

export default AuthCard;
