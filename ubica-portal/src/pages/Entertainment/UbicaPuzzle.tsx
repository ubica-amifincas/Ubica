import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, PuzzlePieceIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function UbicaPuzzle() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex flex-col items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-100 dark:border-gray-700">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LockClosedIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Contenido Exclusivo</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">
                        El juego "Ubica Puzzle" requiere guardar el progreso continuo de tu ciudad inmobilaria, por lo que solo está disponible para usuarios registrados.
                    </p>
                    <Link
                        to="/register"
                        className="block w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
                    >
                        Crear cuenta gratis
                    </Link>
                    <Link
                        to="/entretenimiento"
                        className="block w-full mt-4 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                        Volver a Juegos
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Mini header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/entretenimiento" className="flex items-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors font-medium text-sm">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Volver a Juegos
                    </Link>
                    <div className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center gap-2">
                        <PuzzlePieceIcon className="w-6 h-6 text-indigo-500" />
                        Ubica Puzzle
                    </div>
                    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Nivel 1
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 min-h-[600px] flex items-center justify-center p-8">
                    <div className="text-center max-w-lg">
                        <div className="flex justify-center mb-6">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="w-12 h-12 bg-orange-400 rounded-lg shadow-inner"></div>
                                <div className="w-12 h-12 bg-orange-400 rounded-lg shadow-inner"></div>
                                <div className="w-12 h-12 bg-red-500 rounded-lg shadow-inner"></div>
                                <div className="w-12 h-12 bg-indigo-500 rounded-lg shadow-inner animate-pulse"></div>
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Construyendo el Motor del Juego...</h1>
                        <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
                            Ubica Puzzle está en fase de desarrollo. Pronto podrás combinar terrenos, cimientos y edificios para construir el mayor complejo inmobiliario y escalar en el ranking global.
                        </p>

                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 text-left">
                            <h3 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">Reglas básicas que llegarán pronto:</h3>
                            <ul className="list-disc pl-5 space-y-1 text-indigo-700 dark:text-indigo-400 text-sm">
                                <li>Combina 2 Terrenos para hacer un Cimiento.</li>
                                <li>Combina 2 Cimientos para hacer una Casa.</li>
                                <li>Combina 2 Casas para hacer un Edificio.</li>
                                <li>¡No te quedes sin espacio en el tablero!</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
