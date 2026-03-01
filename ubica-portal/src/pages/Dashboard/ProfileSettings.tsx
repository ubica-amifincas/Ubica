import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    UserCircleIcon,
    CameraIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const ProfileSettings: React.FC = () => {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fullName, setFullName] = useState(user?.full_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [company, setCompany] = useState(user?.company || '');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('La imagen no puede superar los 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setAvatarPreview(result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = () => {
        if (!fullName.trim()) {
            setError('El nombre es obligatorio');
            return;
        }
        setError('');

        updateUser({
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            company: company.trim() || undefined,
            avatar: avatarPreview || undefined,
        });

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Mi Perfil
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Actualiza tu nombre, foto de perfil y datos personales
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Gradient banner */}
                    <div className="h-24 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

                    {/* Avatar section */}
                    <div className="px-6 pb-6">
                        <div className="flex items-end -mt-12 mb-4">
                            <div className="relative group">
                                <motion.div
                                    className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gray-200 dark:bg-gray-600 cursor-pointer"
                                    onClick={handleAvatarClick}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <UserCircleIcon className="h-full w-full text-gray-400 dark:text-gray-500 p-2" />
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                        <CameraIcon className="h-8 w-8 text-white" />
                                    </div>
                                </motion.div>

                                {avatarPreview && (
                                    <button
                                        onClick={handleRemoveAvatar}
                                        className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="ml-4 mb-1">
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {user?.full_name || 'Usuario'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                            Haz clic en la foto para cambiarla. Formatos admitidos: JPG, PNG (máx. 2MB)
                        </p>

                        {/* Form fields */}
                        <div className="space-y-4">
                            {/* Full name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                                    placeholder="Tu nombre completo"
                                />
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                    <span className="ml-2 text-xs text-gray-400">(cambiar desde Configuración)</span>
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                                    placeholder="+34 600 000 000"
                                />
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Empresa / Organización
                                </label>
                                <input
                                    type="text"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                                    placeholder="Nombre de tu empresa"
                                />
                            </div>

                            {/* Role (read-only info) */}
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase">
                                        {user?.role?.charAt(0) || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                        Rol: {user?.role === 'investor' ? 'Inversionista' : user?.role === 'admin' ? 'Administrador' : user?.role || 'Usuario'}
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Miembro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error/Success messages */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                            >
                                {error}
                            </motion.div>
                        )}

                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                            >
                                <CheckIcon className="h-5 w-5" />
                                Perfil actualizado correctamente
                            </motion.div>
                        )}

                        {/* Save button */}
                        <div className="mt-6 flex justify-end">
                            <motion.button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Guardar Cambios
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfileSettings;
