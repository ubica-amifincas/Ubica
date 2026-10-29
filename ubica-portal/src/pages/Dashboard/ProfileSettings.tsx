import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircleIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    realtor: 'Inmobiliaria / Agente',
    investor: 'Inversor',
    user: 'Usuario',
};

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-gray-900 dark:text-white">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
);

/**
 * Datos del perfil en solo lectura: el backend todavía no permite editar nombre, teléfono o empresa
 * desde la cuenta del usuario, así que no se ofrece un formulario que no guardaría nada.
 */
const ProfileSettings: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Datos asociados a tu cuenta</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-600" />
                    <div className="px-6 pb-6">
                        <div className="flex items-end -mt-12 mb-6">
                            <div className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
                                <UserCircleIcon className="h-full w-full text-gray-400 dark:text-gray-500 p-2" />
                            </div>
                            <div className="ml-4 mb-1">
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.full_name || 'Usuario'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                            </div>
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label="Nombre completo" value={user?.full_name} />
                            <Field label="Email" value={user?.email} />
                            <Field label="Teléfono" value={user?.phone} />
                            <Field label="Empresa / Organización" value={user?.company} />
                            <Field label="Rol" value={user?.role ? ROLE_LABELS[user.role] || user.role : undefined} />
                            <Field
                                label="Miembro desde"
                                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) : undefined}
                            />
                        </dl>

                        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                            Para corregir tu nombre, teléfono o empresa, escríbenos desde la{' '}
                            <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">página de contacto</Link>.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/dashboard/settings/email"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <EnvelopeIcon className="h-4 w-4" /> Cambiar email
                            </Link>
                            <Link
                                to="/dashboard/settings/password"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <KeyIcon className="h-4 w-4" /> Cambiar contraseña
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfileSettings;
