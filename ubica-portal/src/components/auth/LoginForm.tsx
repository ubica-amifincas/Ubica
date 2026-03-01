import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthNotifications } from '../../hooks/useAuthNotifications';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const { loginWithNotification } = useAuthNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirigir a la página anterior o al dashboard después del login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithNotification(email, password);

      // Redirigir según el rol del usuario
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      let redirectPath = '/dashboard';

      switch (userData.role) {
        case 'admin':
          redirectPath = '/admin';
          break;
        case 'realtor':
          redirectPath = '/realtor';
          break;
        case 'investor':
          redirectPath = '/investor';
          break;
        default:
          redirectPath = '/dashboard';
      }

      // Si había una URL específica solicitada, usar esa
      const finalPath = location.state?.from?.pathname || redirectPath;
      navigate(finalPath, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  // Users removed for production

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] py-12 px-4 sm:px-6 lg:px-8" style={{ perspective: '1000px' }}>
      <motion.div
        initial={{ opacity: 0, rotateY: -90, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        <div>
          <div className="mx-auto flex justify-center mb-6">
            <img src="/logo_ubica.png" alt="Ubica" className="h-24 md:h-32 object-contain" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mt-4">
            {t('auth.login_title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('auth.login_subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#4a9d78] hover:bg-[#3a8d68] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a9d78] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? t('auth.logging_in') : t('auth.login_button')}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/register"
              className="text-sm text-[#4a9d78] hover:text-[#3a8d68] font-medium"
            >
              {t('auth.no_account_register')}
            </Link>
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              {t('auth.back_to_home')}
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginForm;
