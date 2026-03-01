import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  KeyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  mfaRequired: boolean;
  ipWhitelist: string[];
  auditLogging: boolean;
}

const SecuritySettingsComponent: React.FC = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SecuritySettings>({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    mfaRequired: false,
    ipWhitelist: [],
    auditLogging: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    // Cargar configuraciones desde localStorage
    const savedSettings = localStorage.getItem('ubica_security_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading security settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar en localStorage
      localStorage.setItem('ubica_security_settings', JSON.stringify(settings));
      
      setMessage({ type: 'success', text: t('security.settingsUpdated') });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordPolicyChange = (field: keyof SecuritySettings['passwordPolicy'], value: any) => {
    setSettings(prev => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [field]: value
      }
    }));
  };

  const handleAddIp = () => {
    if (newIp && !settings.ipWhitelist.includes(newIp)) {
      setSettings(prev => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, newIp]
      }));
      setNewIp('');
    }
  };

  const handleRemoveIp = (ip: string) => {
    setSettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(item => item !== ip)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('security.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('security.subtitle')}
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password Policy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-emerald-900/20 rounded-lg">
              <KeyIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.passwordPolicy')}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.minimumPasswordLength')}
              </label>
              <input
                type="number"
                value={settings.passwordPolicy.minLength}
                onChange={(e) => handlePasswordPolicyChange('minLength', parseInt(e.target.value))}
                min="6"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordPolicy.requireUppercase}
                  onChange={(e) => handlePasswordPolicyChange('requireUppercase', e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('security.requireUppercase')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordPolicy.requireNumbers}
                  onChange={(e) => handlePasswordPolicyChange('requireNumbers', e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('security.requireNumbers')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordPolicy.requireSpecialChars}
                  onChange={(e) => handlePasswordPolicyChange('requireSpecialChars', e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('security.requireSpecialChars')}
                </span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Session & Login Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.sessionTimeout')}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.sessionTimeoutMinutes')}
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                min="5"
                max="480"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.maxLoginAttempts')}
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                min="3"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('security.lockoutDuration')}
              </label>
              <input
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }))}
                min="5"
                max="1440"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </motion.div>

        {/* Two-Factor Authentication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.twoFactorAuth')}
            </h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.mfaRequired}
                onChange={(e) => setSettings(prev => ({ ...prev, mfaRequired: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Require MFA for all admin users
              </span>
            </label>

            <div className="p-3 bg-blue-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                When enabled, all users with admin or realtor roles will be required to set up two-factor authentication.
              </p>
            </div>
          </div>
        </motion.div>

        {/* IP Whitelist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <ComputerDesktopIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.ipWhitelist')}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="192.168.1.100"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleAddIp}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {settings.ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{ip}</span>
                  <button
                    onClick={() => handleRemoveIp(ip)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {settings.ipWhitelist.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No IP addresses whitelisted (all IPs allowed)
              </p>
            )}
          </div>
        </motion.div>

        {/* Audit Logging */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.auditLogs')}
            </h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auditLogging}
                onChange={(e) => setSettings(prev => ({ ...prev, auditLogging: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable comprehensive audit logging
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-white">User Actions</div>
                <div className="text-gray-600 dark:text-gray-400">Login, logout, profile changes</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-white">Data Changes</div>
                <div className="text-gray-600 dark:text-gray-400">Property CRUD, user management</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-white">Security Events</div>
                <div className="text-gray-600 dark:text-gray-400">Failed logins, permissions</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <LockClosedIcon className="h-4 w-4" />
          )}
          <span>{loading ? t('status.saving') : t('actions.save')}</span>
        </motion.button>
      </div>
    </div>
  );
};

export default SecuritySettingsComponent;
