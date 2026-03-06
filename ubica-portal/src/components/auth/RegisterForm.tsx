import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemo } from 'react';

interface RegisterFormProps {
  isEmbedded?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ isEmbedded }) => {
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
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    const successContent = (
      <div className="text-center space-y-6">
        <div className="mx-auto flex justify-center">
          <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('auth.success_title')}</h2>
        <div className="text-gray-600 dark:text-gray-400 space-y-2">
          <p>{t('auth.success_msg1')}</p>
          <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{formData.email}</p>
          <p className="text-sm mt-4 px-4">{t('auth.success_msg2')}</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full mt-6 py-4 px-4 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-500 font-bold transition-all shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02]"
        >
          {t('auth.go_to_login')}
        </button>
      </div>
    );

    if (isEmbedded) return successContent;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl">
          {successContent}
        </motion.div>
      </div>
    );
  }

  const formContent = (
    <div className={isEmbedded ? "max-h-[550px] overflow-y-auto pr-3 mr-[-8px] custom-scrollbar" : "max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"}>
      <div>
        <h2 className={`text-center font-black text-gray-900 dark:text-white ${isEmbedded ? 'text-4xl mb-2' : 'text-3xl mt-4'}`}>
          {t('auth.register_title')}
        </h2>
        <p className={`text-center text-gray-400 dark:text-gray-500 font-medium ${isEmbedded ? 'text-lg mt-2 mb-6' : 'mt-2 text-sm'}`}>
          {t('auth.register_subtitle')}
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.fullName')} *</label>
              <input name="full_name" type="text" required value={formData.full_name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.phone')}</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="+34..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.email')} *</label>
            <input name="email" type="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="nombre@ejemplo.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.user_type')} *</label>
              <select name="role" required value={formData.role} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0 cursor-pointer">
                {roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.company')}</label>
              <input name="company" type="text" value={formData.company} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.password')} *</label>
              <input name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="••••••••" />
              <button type="button" className="absolute right-3 top-[34px] text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-1">{t('auth.confirmPassword')} *</label>
              <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 border-b-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-gray-900 dark:text-white transition-all focus:ring-0" placeholder="••••••••" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
            <input id="wantsMfa" name="wantsMfa" type="checkbox" checked={formData.wantsMfa} onChange={(e) => setFormData(prev => ({ ...prev, wantsMfa: e.target.checked }))} className="mt-1 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
            <div className="text-xs">
              <label htmlFor="wantsMfa" className="font-bold text-gray-700 dark:text-gray-300 tracking-tight">{t('mfa.title')}</label>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">{t('mfa.description')}</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase text-sm tracking-wider">
          {loading ? t('auth.registering') : t('auth.register_button')}
        </button>

        {!isEmbedded && (
          <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
            <Link to="/login" className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">{t('auth.have_account_login')}</Link>
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('auth.back_to_home')}</Link>
          </div>
        )}
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #059669; }
      `}</style>
    </div>
  );

  if (isEmbedded) return formContent;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        {formContent}
      </motion.div>
    </div>
  );
};

export default RegisterForm;
