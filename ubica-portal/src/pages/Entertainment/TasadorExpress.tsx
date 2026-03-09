import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function TasadorExpress() {
    const { user } = useAuth();
    const [isPlaying, setIsPlaying] = useState(false);

    // Demo state simple
    const startGame = () => {
        setIsPlaying(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Mini header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/entretenimiento" className="flex items-center text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors font-medium text-sm">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Volver a Juegos
                    </Link>
                    <div className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center gap-2">
                        <CalculatorIcon className="w-6 h-6 text-emerald-500" />
                        Tasador Exprés
                    </div>
                    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {user ? 'Modo Competición' : 'Modo Demo'}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <AnimatePresence mode="wait">
                    {!isPlaying ? (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto text-center"
                        >
                            <div className="h-48 bg-emerald-500 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                <CalculatorIcon className="w-24 h-24 text-white drop-shadow-lg relative z-10" />
                            </div>

                            <div className="p-8">
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">¿Tienes ojo clínico para el mercado?</h1>
                                <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                                    Te mostraremos de forma rápida propiedades reales de la Región de Murcia (ocultando el precio). Fíjate en la ubicación, los metros y las fotos.
                                    Tienes <span className="font-bold text-emerald-600 dark:text-emerald-400">10 segundos</span> para adivinar su precio de mercado actual.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        onClick={startGame}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xl py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-500 hover:to-teal-400 transition-all transform hover:-translate-y-1"
                                    >
                                        {!user ? 'Jugar Ronda de Prueba' : 'Empezar Partida'}
                                    </button>

                                    {!user && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            En el modo demo solo jugarás 3 rondas y los puntos no se guardarán en el ranking.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="game"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 min-h-[600px] flex items-center justify-center"
                        >
                            <div className="text-center p-8">
                                <CalculatorIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4 animate-pulse" />
                                <h2 className="text-2xl font-bold text-gray-400 dark:text-gray-500">Cargando la base de datos de propiedades...</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Próximamente conectaremos esto con las propiedades reales de Ubica.</p>
                                <button
                                    onClick={() => setIsPlaying(false)}
                                    className="mt-8 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                                >
                                    Volver al inicio
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ad block space - example of subtle branding */}
                <div className="mt-12 text-center opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Patrocinado por</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300">AMI Fincas</span>
                        <span className="text-gray-400 dark:text-gray-500 text-sm">| Excelencia Certificada 5.0 en Administración</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
