import React, { useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import { PageHeader, PageStack, buttonClass } from '../../components/dashboard/ui';

const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-white sm:text-sm';

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
        <PageStack>
            <PageHeader
                title="Cambiar dirección de email"
                description={<>Te enviaremos un enlace al nuevo correo; el cambio se aplica al confirmarlo.</>}
            />
            <div className="max-w-3xl rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
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
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm"
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
                            className={buttonClass.primary}
                        >
                            {isLoading ? 'Enviando...' : 'Enviar enlace de confirmación'}
                        </button>
                    </div>
                </form>
            </div>
        </PageStack>
    );
}
