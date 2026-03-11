import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { PlayCircleIcon, CalculatorIcon, LockClosedIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function EntertainmentHub() {
    const { t } = useLanguage();
    const { user } = useAuth();

    const games = [
        {
            id: 'tasador',
            title: 'Tasador Exprés',
            description: 'Pon a prueba tu "ojo clínico" inmobiliario. Adivina el precio de mercado de distintas propiedades basándote en sus características.',
            icon: CalculatorIcon,
            path: '/entretenimiento/tasador',
            color: 'from-emerald-500 to-teal-500',
            requiresAuth: false, // The demo is free, but the full game requires login
        },
        {
            id: 'balance',
            title: 'La Torre Fincas (3D)',
            description: 'Demuestra tu pulso de arquitecto. Apila bloques usando físicas reales para construir el rascacielos más alto posible.',
            icon: BuildingOffice2Icon,
            path: '/entretenimiento/balance',
            color: 'from-sky-500 to-blue-600',
            requiresAuth: true, // Only for registered users (global rankings)
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl"
                    >
                        Ubica <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Play</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-xl text-gray-600 dark:text-gray-300"
                    >
                        Tómate un respiro, diviértete y demuestra tus conocimientos del sector inmobiliario.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {games.map((game, index) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className={`relative flex flex-col rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 group ${!user && game.requiresAuth ? 'opacity-80' : ''}`}
                        >
                            <div className={`h-32 bg-gradient-to-r ${game.color} p-6 flex flex-col justify-end relative overflow-hidden shrink-0`}>
                                <div className="absolute right-0 top-0 opacity-20 -translate-y-1/4 translate-x-1/4">
                                    <game.icon className="w-48 h-48 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white relative z-10 flex items-center gap-2">
                                    <game.icon className="w-8 h-8 shrink-0" />
                                    {game.title}
                                </h2>
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    {game.description}
                                </p>

                                {!user && game.requiresAuth ? (
                                    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4 flex items-start gap-3 mt-auto">
                                        <LockClosedIcon className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Requiere cuenta gratuita</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Regístrate para jugar al juego completo, guardar tus puntuaciones y competir en el ranking mensual.</p>
                                            <Link to="/register" className="mt-2 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                                Crear cuenta ahora
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto">
                                        <Link
                                            to={game.path}
                                            className={`block w-full text-center py-3 px-4 rounded-xl font-bold text-white transition-all bg-gradient-to-r ${game.color} opacity-90 hover:opacity-100 shadow-md transform hover:-translate-y-0.5`}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                <PlayCircleIcon className="w-6 h-6" />
                                                {!user && !game.requiresAuth ? 'Jugar Demo' : 'Jugar Ahora'}
                                            </span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {!user && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100 dark:border-gray-700 text-center shadow-lg"
                    >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¿Quieres desbloquear todo el contenido?</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                            Únete a Ubica hoy mismo. Es gratis durante el primer año. Podrás jugar a todos los minijuegos, acceder al dashboard y promocionar tus propiedades con la garantía de AMI Fincas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/register" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30">
                                Registrarse Gratis
                            </Link>
                            <Link to="/login" className="bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-8 py-3 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-gray-600 transition-colors">
                                Ya tengo cuenta
                            </Link>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
