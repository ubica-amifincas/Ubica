import React, { useState } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth, User } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import { PageHeader, PageStack, buttonClass } from '../../components/dashboard/ui';

const MIN_LENGTH = 8;

const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-800 dark:text-white sm:text-sm';

export default function SettingsPassword() {
    const notifications = useNotifications();
    const { setSession } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (newPassword.length < MIN_LENGTH) {
            setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('La nueva contraseña debe ser distinta de la actual.');
            return;
        }

        setIsLoading(true);
        try {
            // El backend invalida los tokens anteriores y devuelve uno nuevo: lo guardamos para seguir con la sesión
            const res = await apiService.changePassword(currentPassword, newPassword);
            setSession(res.access_token, res.user as User);
            notifications.success('Contraseña actualizada', 'Tu contraseña se ha cambiado correctamente.');
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageStack>
            <PageHeader
                title="Cambiar contraseña"
                description={<>Usa al menos {MIN_LENGTH} caracteres. Las sesiones abiertas en otros dispositivos se cerrarán.</>}
            />
            <div className="max-w-3xl rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
                    {error && (
                        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div role="status" className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-lg text-sm">
                            Contraseña actualizada. Tu sesión sigue abierta en este dispositivo.
                        </div>
                    )}

                    <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña Actual</label>
                        <input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nueva Contraseña</label>
                        <input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={MIN_LENGTH}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nueva Contraseña</label>
                        <input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                            className={buttonClass.primary}
                        >
                            {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </PageStack>
    );
}
