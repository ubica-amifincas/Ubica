import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const AuthPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(true);

    // Sync state with URL
    useEffect(() => {
        if (location.pathname === '/register') {
            setIsLogin(false);
        } else {
            setIsLogin(true);
        }
    }, [location.pathname]);

    const toggleAuth = () => {
        if (isLogin) {
            navigate('/register');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Floating Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
            </div>

            {/* Back to Home Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate('/')}
                className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all font-medium"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="text-sm">{t('auth.back_to_home')}</span>
            </motion.button>

            {/* Main Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-[1000px] h-[650px] bg-white dark:bg-gray-800 rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row"
            >
                {/* Animated Background Panel (Sliding Overlay) */}
                <motion.div
                    className="absolute inset-y-0 w-1/2 hidden md:flex z-30"
                    animate={{
                        x: isLogin ? '100%' : '0%',
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                    <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 relative flex flex-col items-center justify-center p-12 text-white text-center">
                        {/* Shapes */}
                        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-32 -mt-32" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/20 rounded-full -ml-32 -mb-32" />
                        </div>

                        <AnimatePresence mode="wait">
                            {isLogin ? (
                                <motion.div
                                    key="login-panel"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="relative z-10"
                                >
                                    <h1 className="text-4xl font-black mb-4">¿Nuevo aquí?</h1>
                                    <p className="text-emerald-50/80 text-lg mb-8 leading-relaxed">
                                        Únete a la plataforma inmobiliaria más avanzada y comienza tu viaje hoy mismo.
                                    </p>
                                    <button
                                        onClick={toggleAuth}
                                        className="px-10 py-4 bg-transparent border-2 border-white rounded-2xl font-bold uppercase tracking-wider hover:bg-white hover:text-emerald-600 transition-all"
                                    >
                                        Crear Cuenta
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register-panel"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="relative z-10"
                                >
                                    <h1 className="text-4xl font-black mb-4">¡Bienvenido de nuevo!</h1>
                                    <p className="text-emerald-50/80 text-lg mb-8 leading-relaxed">
                                        Para mantenerte conectado con nosotros, inicia sesión con tu información personal.
                                    </p>
                                    <button
                                        onClick={toggleAuth}
                                        className="px-10 py-4 bg-transparent border-2 border-white rounded-2xl font-bold uppercase tracking-wider hover:bg-white hover:text-emerald-600 transition-all"
                                    >
                                        Iniciar Sesión
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Forms Sections */}
                <div className="flex-1 relative flex overflow-hidden">
                    {/* Login Section */}
                    <motion.div
                        className="w-full md:w-1/2 h-full flex items-center justify-center p-8 md:p-12 absolute inset-y-0"
                        animate={{
                            x: isLogin ? '0%' : '-100%',
                            opacity: isLogin ? 1 : 0
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    >
                        <div className="w-full max-w-[360px]">
                            <LoginForm isEmbedded />
                        </div>
                    </motion.div>

                    {/* Register Section */}
                    <motion.div
                        className="w-full md:w-1/2 h-full flex items-center justify-center p-8 md:p-12 absolute inset-y-0 right-0"
                        animate={{
                            x: !isLogin ? '0%' : '100%',
                            opacity: !isLogin ? 1 : 0
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    >
                        <div className="w-full max-w-[360px]">
                            <RegisterForm isEmbedded />
                        </div>
                    </motion.div>
                </div>

                {/* Mobile Switch Footer (Visible only on mobile) */}
                <div className="md:hidden p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                    </p>
                    <button
                        onClick={toggleAuth}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-2xl shadow-lg"
                    >
                        {isLogin ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
