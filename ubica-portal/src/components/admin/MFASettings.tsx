import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';

interface MFAUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
  mfa_setup_date?: string;
  last_verified?: string;
}

interface MFASettings {
  requireMFA: boolean;
  allowedMethods: string[];
  backupCodesEnabled: boolean;
  gracePeriodDays: number;
}

const MFASettingsComponent: React.FC = () => {
  const { t } = useLanguage();
  const apiService = useAuthenticatedFetch();
  const [users, setUsers] = useState<MFAUser[]>([]);
  const [settings, setSettings] = useState<MFASettings>({
    requireMFA: false,
    allowedMethods: ['totp', 'sms'],
    backupCodesEnabled: true,
    gracePeriodDays: 7
  });
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState<'qr' | 'manual' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<MFAUser | null>(null);

  useEffect(() => {
    loadUsers();
    loadMFASettings();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await apiService.getAllUsers();
      const mfaUsers: MFAUser[] = usersData.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        mfa_enabled: localStorage.getItem(`mfa_${user.id}`) === 'enabled',
        mfa_setup_date: localStorage.getItem(`mfa_setup_date_${user.id}`) || undefined,
        last_verified: localStorage.getItem(`mfa_last_verified_${user.id}`) || undefined
      }));
      setUsers(mfaUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMFASettings = () => {
    const savedSettings = localStorage.getItem('ubica_mfa_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading MFA settings:', error);
      }
    }
  };

  const saveMFASettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('ubica_mfa_settings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'MFA settings updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving MFA settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const generateSecretKey = () => {
    // Generar una clave secreta simulada
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleSetupMFA = (user: MFAUser) => {
    setSelectedUser(user);
    setSecretKey(generateSecretKey());
    setBackupCodes(generateBackupCodes());
    setSetupMode('qr');
    setVerificationCode('');
  };

  const handleVerifySetup = async () => {
    if (!selectedUser || !verificationCode) return;

    // Simular verificación (en producción verificarías con el servidor)
    if (verificationCode.length === 6) {
      // Marcar MFA como habilitado
      localStorage.setItem(`mfa_${selectedUser.id}`, 'enabled');
      localStorage.setItem(`mfa_setup_date_${selectedUser.id}`, new Date().toISOString());
      localStorage.setItem(`mfa_secret_${selectedUser.id}`, secretKey);
      localStorage.setItem(`mfa_backup_codes_${selectedUser.id}`, JSON.stringify(backupCodes));

      // Actualizar estado
      setUsers(prev => prev.map(user =>
        user.id === selectedUser.id
          ? { ...user, mfa_enabled: true, mfa_setup_date: new Date().toISOString() }
          : user
      ));

      setMessage({ type: 'success', text: `MFA enabled for ${selectedUser.full_name}` });
      setShowBackupCodes(true);
    } else {
      setMessage({ type: 'error', text: 'Invalid verification code. Please try again.' });
    }
  };

  const handleDisableMFA = (user: MFAUser) => {
    if (window.confirm(`Are you sure you want to disable MFA for ${user.full_name}?`)) {
      localStorage.removeItem(`mfa_${user.id}`);
      localStorage.removeItem(`mfa_setup_date_${user.id}`);
      localStorage.removeItem(`mfa_secret_${user.id}`);
      localStorage.removeItem(`mfa_backup_codes_${user.id}`);

      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, mfa_enabled: false, mfa_setup_date: undefined }
          : u
      ));

      setMessage({ type: 'success', text: `MFA disabled for ${user.full_name}` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard' });
      setTimeout(() => setMessage(null), 2000);
    });
  };

  const closeSetupModal = () => {
    setSetupMode(null);
    setSelectedUser(null);
    setVerificationCode('');
    setSecretKey('');
    setBackupCodes([]);
    setShowBackupCodes(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('mfa.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configura los ajustes de autenticación de dos factores para mayor seguridad
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            }`}
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global MFA Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ajustes Globales
            </h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requireMFA}
                onChange={(e) => setSettings(prev => ({ ...prev, requireMFA: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Requerir MFA para administradores e inmobiliarias
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backupCodesEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, backupCodesEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Habilitar códigos de respaldo
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Periodo de gracia para nuevos usuarios (días)
              </label>
              <input
                type="number"
                value={settings.gracePeriodDays}
                onChange={(e) => setSettings(prev => ({ ...prev, gracePeriodDays: parseInt(e.target.value) }))}
                min="0"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              onClick={saveMFASettings}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </motion.div>

        {/* MFA Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Estadísticas MFA
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {users.filter(u => u.mfa_enabled).length}
              </div>
              <div className="text-sm text-emerald-800 dark:text-emerald-300">MFA Habilitado</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {users.filter(u => !u.mfa_enabled && (u.role === 'admin' || u.role === 'realtor')).length}
              </div>
              <div className="text-sm text-red-800 dark:text-red-300">Requiere Config.</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Cobertura:</strong> {users.length > 0 ? Math.round((users.filter(u => u.mfa_enabled).length / users.length) * 100) : 0}% de usuarios
            </div>
          </div>
        </motion.div>
      </div>

      {/* User MFA Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Estado MFA de Usuarios
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  MFA Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Setup Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'realtor' ? 'bg-emerald-100 text-emerald-800' :
                          user.role === 'investor' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.mfa_enabled ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-600 dark:text-green-400">Enabled</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-600 dark:text-red-400">Disabled</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.mfa_setup_date ? new Date(user.mfa_setup_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {user.mfa_enabled ? (
                      <button
                        onClick={() => handleDisableMFA(user)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetupMFA(user)}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        Setup MFA
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* MFA Setup Modal */}
      <AnimatePresence>
        {setupMode && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !showBackupCodes && closeSetupModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {!showBackupCodes ? (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <QrCodeIcon className="h-6 w-6 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Setup MFA for {selectedUser.full_name}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* QR Code Placeholder */}
                    <div className="bg-gray-100 dark:bg-gray-700 p-8 rounded-lg text-center">
                      <QrCodeIcon className="h-20 w-20 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        QR Code for {selectedUser.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Scan with Google Authenticator or Authy
                      </p>
                    </div>

                    {/* Manual Entry */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                        Manual entry key:
                      </p>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-xs bg-white dark:bg-gray-700 p-2 rounded border font-mono">
                          {secretKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(secretKey)}
                          className="p-1 text-emerald-600 hover:text-emerald-800"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Verification */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enter verification code:
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-center text-lg font-mono"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={closeSetupModal}
                        className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleVerifySetup}
                        disabled={verificationCode.length !== 6}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verify & Enable
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('mfa.setupComplete')}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        MFA has been successfully enabled for {selectedUser.full_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('mfa.backupCodes')}:
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                          {backupCodes.map((code, index) => (
                            <div key={index} className="text-center p-1 bg-white dark:bg-gray-800 rounded">
                              {code}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t('mfa.saveBackupCodes')}
                      </p>
                    </div>

                    <button
                      onClick={closeSetupModal}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      Complete Setup
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MFASettingsComponent;
