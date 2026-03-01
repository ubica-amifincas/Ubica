import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemo } from 'react';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    company: '',
    phone: '',
    role: 'user',
    wantsMfa: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useLanguage();

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError(t('forms.passwordsDoNotMatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('forms.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, wantsMfa, ...registrationData } = formData;
      await register(registrationData);
      // Wait actually if MFA wants to be enabled maybe we store it in preferences.
      // For now, we just proceed to the success step.
      setIsSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.register_error'));
    } finally {
      setLoading(false);
    }
  };

  const roles = useMemo(() => [
    { value: 'user', label: t('roles.user') },
    { value: 'investor', label: t('roles.investor') },
    { value: 'realtor', label: t('roles.realtor') }
  ], [t]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] py-12 px-4 sm:px-6 lg:px-8" style={{ perspective: '1000px' }}>
        <motion.div
          initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 text-center space-y-6"
        >
          <div className="mx-auto flex justify-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.success_title')}</h2>
          <div className="text-gray-600 dark:text-gray-400 space-y-2">
            <p>{t('auth.success_msg1')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{formData.email}</p>
            <p className="text-sm mt-4">{t('auth.success_msg2')}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-6 py-3 px-4 rounded-lg text-white bg-[#4a9d78] hover:bg-[#3a8d68] font-medium transition-colors shadow-md hover:shadow-lg"
          >
            {t('auth.go_to_login')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] py-12 px-4 sm:px-6 lg:px-8" style={{ perspective: '1000px' }}>
      <motion.div
        initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mt-4">
            {t('auth.register_title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('auth.register_subtitle')}
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
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.fullName')} *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Juan Pérez García"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.email')} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.user_type')} *
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.company')}
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Mi Empresa S.L."
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.phone')}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="+34 600 000 000"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.password')} *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.confirmPassword')} *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start mt-4">
              <div className="flex items-center h-5">
                <input
                  id="wantsMfa"
                  name="wantsMfa"
                  type="checkbox"
                  checked={formData.wantsMfa}
                  onChange={(e) => setFormData(prev => ({ ...prev, wantsMfa: e.target.checked }))}
                  className="focus:ring-[#4a9d78] h-4 w-4 text-[#4a9d78] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="wantsMfa" className="font-medium text-gray-700 dark:text-gray-300">
                  {t('mfa.title')}
                </label>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {t('mfa.description')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#4a9d78] hover:bg-[#3a8d68] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a9d78] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? t('auth.registering') : t('auth.register_button')}
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <Link
              to="/login"
              className="text-sm text-[#4a9d78] hover:text-[#3a8d68] font-medium"
            >
              {t('auth.have_account_login')}
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

export default RegisterForm;
