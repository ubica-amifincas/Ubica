import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-white sm:text-sm';

export default function SettingsEmail() {
    const { user } = useAuth();
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultMessage, setResultMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResultMessage('');

        const email = newEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Introduce una dirección de correo válida.');
            return;
        }
        if (email.toLowerCase() === (user?.email || '').toLowerCase()) {
            setError('El nuevo correo es igual al actual.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await apiService.changeEmail(email, password);
            setResultMessage(
                res?.message ||
                `Te hemos enviado un enlace de confirmación a ${email}. El cambio se aplicará cuando lo abras.`
            );
            setNewEmail('');
            setPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo solicitar el cambio de correo.');
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
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <EnvelopeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cambiar Dirección de Email</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Te enviaremos un enlace al nuevo correo; el cambio se aplica al confirmarlo.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6" noValidate>
                    {error && (
                        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {resultMessage && (
                        <div role="status" className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-lg text-sm">
                            {resultMessage}
                        </div>
                    )}

                    <div>
                        <label htmlFor="current-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Actual</label>
                        <input
                            id="current-email"
                            type="email"
                            disabled
                            value={user?.email || ''}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nuevo Email</label>
                        <input
                            id="new-email"
                            type="email"
                            autoComplete="email"
                            required
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className={inputClass}
                            placeholder="nuevo@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="email-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Contraseña actual <span className="text-xs text-gray-500 font-normal">(para confirmar)</span>
                        </label>
                        <input
                            id="email-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading || !newEmail || !password}
                            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar enlace de confirmación'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
