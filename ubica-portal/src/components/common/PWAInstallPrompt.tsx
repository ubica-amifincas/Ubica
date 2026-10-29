import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon, XMarkIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useInstallApp } from '../../hooks/useInstallApp';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

const recentlyDismissed = () => {
    try {
        const dismissed = Number(localStorage.getItem(DISMISS_KEY));
        return dismissed > 0 && Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
};

/**
 * Aviso flotante para instalar la app, unos segundos después de que el navegador lo permita.
 * Usa el mismo aviso que el botón "Instalar app" (useInstallApp): el navegador solo deja usarlo una vez.
 */
export function PWAInstallPrompt() {
    const { canPrompt, install } = useInstallApp();
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (!canPrompt || recentlyDismissed()) {
            setShowBanner(false);
            return;
        }
        // Con un pequeño retraso, para no asaltar nada más entrar
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
    }, [canPrompt]);

    const handleInstall = async () => {
        await install();
        setShowBanner(false);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch { /* se vuelve a ofrecer */ }
    };

    if (!showBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-[9999]"
            >
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-gray-200/50 dark:border-gray-700 p-4 relative overflow-hidden">
                    {/* Gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500"></div>

                    <button
                        onClick={handleDismiss}
                        aria-label="Ahora no"
                        className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>

                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-xl shadow-lg">
                            <DevicePhoneMobileIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Instalar Ubica
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                Añade Ubica a tu pantalla de inicio para acceso rápido
                            </p>
                        </div>
                    </div>

                    <motion.button
                        onClick={handleInstall}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Instalar App
                    </motion.button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
