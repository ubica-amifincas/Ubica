import React from 'react';
import { Link } from 'react-router-dom';
import { UserCircleIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, PageStack, Card, buttonClass } from '../../components/dashboard/ui';

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
        <PageStack>
            <PageHeader title="Mi perfil" description="Datos asociados a tu cuenta" />

            <Card className="max-w-3xl overflow-hidden">
                <div className="flex items-center gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-700">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-900/40">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <UserCircleIcon className="h-full w-full p-1.5 text-emerald-700 dark:text-emerald-300" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-display text-lg font-semibold text-gray-900 dark:text-white">{user?.full_name || 'Usuario'}</p>
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                </div>
                <div className="px-6 py-6">

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
                            <Link to="/contact" className="text-emerald-700 dark:text-emerald-300 font-medium hover:underline">página de contacto</Link>.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/dashboard/settings/email"
                                className={buttonClass.secondary}
                            >
                                <EnvelopeIcon className="h-4 w-4" /> Cambiar email
                            </Link>
                            <Link
                                to="/dashboard/settings/password"
                                className={buttonClass.secondary}
                            >
                                <KeyIcon className="h-4 w-4" /> Cambiar contraseña
                            </Link>
                        </div>
                </div>
            </Card>
        </PageStack>
    );
};

export default ProfileSettings;
