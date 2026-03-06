import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthNotifications } from '../../hooks/useAuthNotifications';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';

interface LoginFormProps {
  isEmbedded?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ isEmbedded }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const { loginWithNotification } = useAuthNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithNotification(email, password);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      let redirectPath = '/dashboard';

      switch (userData.role) {
        case 'admin': redirectPath = '/admin'; break;
        case 'realtor': redirectPath = '/realtor'; break;
        case 'investor': redirectPath = '/investor'; break;
        default: redirectPath = '/dashboard';
      }

      const finalPath = location.state?.from?.pathname || redirectPath;
      navigate(finalPath, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className={isEmbedded ? "" : "max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"}>
      <div>
        {!isEmbedded && (
          <div className="mx-auto flex justify-center mb-6">
            <img src="/logo_ubica.png" alt="Ubica" className="h-24 md:h-32 object-contain" />
          </div>
        )}
        <h2 className={`text-center font-black text-gray-900 dark:text-white ${isEmbedded ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-3xl mt-4'}`}>
          {t('auth.login_title')}
        </h2>
        <p className={`text-center text-gray-400 dark:text-gray-500 font-medium ${isEmbedded ? 'text-base sm:text-lg mt-2 mb-6 md:mb-8' : 'mt-2 text-sm'}`}>
          {t('auth.login_subtitle')}
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0 focus:bg-white dark:focus:bg-gray-700"
              placeholder="nombre@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">
              {t('auth.password')}
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0 focus:bg-white dark:focus:bg-gray-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-500 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link to="#" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 tracking-wider uppercase text-sm"
          >
            {loading ? t('auth.logging_in') : t('auth.login_button')}
          </button>
        </div>

        {!isEmbedded && (
          <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
            <Link to="/register" className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
              {t('auth.no_account_register')}
            </Link>
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {t('auth.back_to_home')}
            </Link>
          </div>
        )}
      </form>
    </div>
  );

  if (isEmbedded) return formContent;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {formContent}
      </motion.div>
    </div>
  );
};

export default LoginForm;
