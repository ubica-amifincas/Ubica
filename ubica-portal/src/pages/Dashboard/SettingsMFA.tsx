import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../../contexts/NotificationContext';

export default function SettingsMFA() {
    const notifications = useNotifications();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const toggleMFA = async () => {
        setIsLoading(true);
        // Simulate API Call
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setIsEnabled(!isEnabled);
            if (!isEnabled) {
                notifications.success('MFA Activado', 'La autenticación multifactor se ha activado correctamente. Escanea el código QR con tu aplicación autenticadora.');
            } else {
                notifications.success('MFA Desactivado', 'La autenticación multifactor ha sido desactivada para tu cuenta.');
            }
        } catch {
            notifications.error('Error', 'Hubo un problema al cambiar la configuración de MFA.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
                <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Autenticación Multifactor (MFA)</h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Protege tu cuenta con una capa de seguridad adicional.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Estado de MFA</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isEnabled
                                    ? 'La autenticación multifactor está actualmente activada.'
                                    : 'MFA no está configurado.'}
                            </p>
                        </div>

                        <button
                            onClick={toggleMFA}
                            disabled={isLoading}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isEnabled ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'
                                } disabled:opacity-50`}
                        >
                            <span className="sr-only">Toggle MFA</span>
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {isEnabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-lg text-center"
                        >
                            <QrCodeIcon className="mx-auto h-24 w-24 text-emerald-600 dark:text-emerald-400 mb-4" />
                            <h3 className="text-lg font-medium tracking-tight text-gray-900 dark:text-white">Configura tu aplicación</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                Utiliza una aplicación como Google Authenticator o Authy para escanear el código QR y vincular tu cuenta.
                            </p>
                            <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-800">
                                <span className="text-xs text-gray-500 font-mono tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                                    JBSWY3DPEHPK3PXP
                                </span>
                                <p className="mt-2 text-xs text-gray-400">Si no puedes escanear el QR, introduce el código manualmente.</p>
                            </div>
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </div>
    );
}
