import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../hooks/useLanguage';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const fillDemoCredentials = () => {
    setFormData({
      email: 'admin@ubica.com',
      password: 'admin123'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <motion.div
        className="max-w-md w-full space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <motion.div
              className="mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <img src="/inmo_amilogo.png" alt="Ubica Logo" className="h-20 mx-auto" />
            </motion.div>
          </Link>

          <h2 className="text-3xl font-extrabold text-white">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-emerald-100">
            {t('login.subtitle')}
          </p>
          <p className="mt-1 text-sm text-emerald-200 font-medium">
            {t('login.slogan')}
          </p>
        </div>

        {/* Demo Info */}
        <motion.div
          className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-emerald-100 text-sm text-center mb-2">
            {t('login.demo')}
          </p>
          <motion.button
            onClick={fillDemoCredentials}
            className="w-full text-white bg-white/20 hover:bg-white/30 px-3 py-2 rounded-md text-sm transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('login.use_demo')}
          </motion.button>
        </motion.div>

        {/* Form */}
        <motion.form
          className="space-y-6"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="sr-only">
                {t('login.email')}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent backdrop-blur-sm"
                  placeholder={t('login.email')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                {t('login.password')}
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent backdrop-blur-sm"
                  placeholder={t('login.password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="bg-red-500/20 border border-red-500/30 text-red-100 px-4 py-3 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-white/90 to-white hover:from-white hover:to-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                <span>{t('login.submitting')}</span>
              </div>
            ) : (
              t('login.submit')
            )}
          </motion.button>

          {/* Back to Home */}
          <div className="text-center">
            <Link
              to="/"
              className="text-emerald-100 hover:text-white transition-colors duration-200 text-sm"
            >
              {t('login.back_home')}
            </Link>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
