import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, CalculatorIcon, MapPinIcon, HomeIcon, ArrowsPointingOutIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import type { Property } from '../../types';

type GameState = 'intro' | 'loading' | 'playing' | 'round-result' | 'game-over';

export default function TasadorExpress() {
    const { user } = useAuth();

    const [gameState, setGameState] = useState<GameState>('intro');
    const [properties, setProperties] = useState<Property[]>([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const [options, setOptions] = useState<number[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const ROUNDS_LIMIT = user ? 10 : 3;

    const startGame = async () => {
        setGameState('loading');
        setScore(0);
        setCurrentRound(0);

        try {
            // Pedimos bastantes para poder barajarlas
            const fetchedProperties = await apiService.getProperties(0, 50);

            // Filtrar las que tengan precio y fotos
            let validProperties = fetchedProperties.filter(p => p.price > 0 && p.images && p.images.length > 0);

            // Barajar aleatoriamente (Fisher-Yates)
            for (let i = validProperties.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [validProperties[i], validProperties[j]] = [validProperties[j], validProperties[i]];
            }

            // Seleccionar las N necesarias
            const gameProperties = validProperties.slice(0, ROUNDS_LIMIT);

            if (gameProperties.length === 0) {
                alert("No hay suficientes propiedades para jugar. Inténtalo más tarde.");
                setGameState('intro');
                return;
            }

            setProperties(gameProperties);
            prepareRound(gameProperties[0]);

        } catch (error) {
            console.error("Error cargando propiedades para el juego", error);
            alert("Hubo un error al preparar el juego. Revisa tu conexión.");
            setGameState('intro');
        }
    };

    const prepareRound = (property: Property) => {
        const realPrice = property.price;

        // Generar opciones falsas lógicas (+/- 5% a 25%)
        const generateFakePrice = (multiplier: number) => {
            // Redondear a miles más cercanos para que parezcan precios reales
            return Math.round((realPrice * multiplier) / 1000) * 1000;
        };

        const fake1 = generateFakePrice(0.85); // 15% menos
        const fake2 = generateFakePrice(1.10); // 10% más
        const fake3 = generateFakePrice(1.25); // 25% más

        // Evitar duplicados por redondeo
        let newOptions = Array.from(new Set([realPrice, fake1, fake2, fake3]));
        while (newOptions.length < 4) {
            newOptions.push(generateFakePrice(0.90 + Math.random() * 0.2)); // Rellenar si hubo colisión
            newOptions = Array.from(new Set(newOptions));
        }

        // Barajar opciones
        newOptions.sort(() => Math.random() - 0.5);

        setOptions(newOptions);
        setSelectedOption(null);
        setTimeLeft(10);
        setGameState('playing');
    };

    // Timer effect
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(t => t - 1);
            }, 1000);
        } else if (gameState === 'playing' && timeLeft === 0) {
            handleTimeOut();
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timeLeft, gameState]);

    const handleTimeOut = () => {
        setSelectedOption(-1); // -1 signifies timeout
        setGameState('round-result');
    };

    const handleGuess = (guessedPrice: number) => {
        if (gameState !== 'playing') return;

        if (timerRef.current) clearTimeout(timerRef.current);
        setSelectedOption(guessedPrice);

        const realPrice = properties[currentRound].price;

        if (guessedPrice === realPrice) {
            // Puntos en función del tiempo sobrante (+10 por acertar, +1 por cada segundo)
            setScore(s => s + 10 + timeLeft);
        }

        setGameState('round-result');
    };

    const nextRound = () => {
        if (currentRound + 1 >= properties.length) {
            setGameState('game-over');
        } else {
            const nextIndex = currentRound + 1;
            setCurrentRound(nextIndex);
            prepareRound(properties[nextIndex]);
        }
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
                    <div className="text-sm font-semibold flex items-center gap-4">
                        <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">{user ? 'Modo Competición' : 'Modo Demo'}</span>
                        {gameState !== 'intro' && gameState !== 'loading' && (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                                Puntuación: {score}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <AnimatePresence mode="wait">
                    {gameState === 'intro' && (
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
                    )}

                    {gameState === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 min-h-[500px] flex flex-col items-center justify-center p-8 text-center"
                        >
                            <CalculatorIcon className="w-16 h-16 text-emerald-500 dark:text-emerald-400 mx-auto mb-6 animate-pulse" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Buscando propiedades en Murcia...</h2>
                            <p className="text-gray-500 dark:text-gray-400">Preparando tu partida aleatoria.</p>
                        </motion.div>
                    )}

                    {(gameState === 'playing' || gameState === 'round-result') && properties[currentRound] && (
                        <motion.div
                            key="gameplay"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            {/* Image Section */}
                            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 group">
                                <img
                                    src={properties[currentRound].images[0] || 'https://via.placeholder.com/800x600?text=Sin+Imagen'}
                                    alt="Propiedad Misteriosa"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />

                                {/* Round indicator & Timer Overlay */}
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                                    <span>Ronda {currentRound + 1}/{ROUNDS_LIMIT}</span>
                                </div>

                                <div className={`absolute top-4 right-4 backdrop-blur-sm px-4 py-2 rounded-xl font-black text-xl flex items-center gap-2 transition-colors ${timeLeft <= 3 ? 'bg-red-500/80 text-white animate-pulse' : 'bg-black/60 text-white'}`}>
                                    <ClockIcon className="w-6 h-6" />
                                    {timeLeft}s
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-6 md:p-8">
                                <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Datos Clave</h3>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize mb-4 line-clamp-1">{properties[currentRound].type} - {properties[currentRound].status === 'for-sale' ? 'Venta' : properties[currentRound].status}</h2>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <MapPinIcon className="w-5 h-5 text-gray-400" />
                                                <span className="truncate">{properties[currentRound].location || properties[currentRound].address || 'Murcia'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <HomeIcon className="w-5 h-5 text-gray-400" />
                                                <span>{properties[currentRound].bedrooms} Hab. · {properties[currentRound].bathrooms} Baños</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                                                <span>{properties[currentRound].area} m²</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {options.map((optionPrice, idx) => {
                                        const isRealPrice = optionPrice === properties[currentRound].price;
                                        const isSelected = selectedOption === optionPrice;
                                        const didTimeout = selectedOption === -1;

                                        let buttonClass = "py-4 px-6 rounded-2xl font-bold text-lg md:text-xl transition-all border-2 text-center relative overflow-hidden ";

                                        if (gameState === 'playing') {
                                            buttonClass += "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20";
                                        } else if (gameState === 'round-result') {
                                            // Result revealed
                                            if (isRealPrice) {
                                                buttonClass += "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-400 scale-105 z-10 shadow-lg";
                                            } else if (isSelected) {
                                                buttonClass += "border-red-500 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border-red-400 opacity-80";
                                            } else {
                                                buttonClass += "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-600 opacity-50";
                                            }
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={gameState !== 'playing'}
                                                onClick={() => handleGuess(optionPrice)}
                                                className={buttonClass}
                                            >
                                                {gameState === 'round-result' && isRealPrice && <CheckCircleIcon className="absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 text-emerald-500" />}
                                                {gameState === 'round-result' && isSelected && !isRealPrice && <XCircleIcon className="absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 text-red-500" />}
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(optionPrice)}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Result Message & Next Button */}
                                {gameState === 'round-result' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-8 flex flex-col sm:flex-row items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800"
                                    >
                                        <div className="text-center sm:text-left mb-4 sm:mb-0">
                                            {selectedOption === properties[currentRound].price ? (
                                                <>
                                                    <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400">¡Ojo de lince!</h4>
                                                    <p className="text-gray-600 dark:text-gray-400">Has acertado de lleno. +{10 + timeLeft} pts</p>
                                                </>
                                            ) : selectedOption === -1 ? (
                                                <>
                                                    <h4 className="text-xl font-black text-red-600 dark:text-red-400">¡Tiempo agotado!</h4>
                                                    <p className="text-gray-600 dark:text-gray-400">No sumas puntos esta ronda.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <h4 className="text-xl font-black text-red-600 dark:text-red-400">Te has pasado (o quedado corto)</h4>
                                                    <p className="text-gray-600 dark:text-gray-400">La próxima vez fíjate mejor en la zona.</p>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={nextRound}
                                            className="w-full sm:w-auto px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                        >
                                            {currentRound + 1 >= ROUNDS_LIMIT ? 'Ver Resultados' : 'Siguiente Ronda'}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'game-over' && (
                        <motion.div
                            key="game-over"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto text-center p-8 md:p-12"
                        >
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CalculatorIcon className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                            </div>

                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">¡Tasación Finalizada!</h2>

                            <div className="my-8 space-y-2">
                                <p className="text-gray-500 dark:text-gray-400 text-lg uppercase tracking-widest font-semibold">Puntuación Final</p>
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                    {score}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 mb-8 text-center border border-gray-100 dark:border-gray-800">
                                {score >= 80 ? (
                                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">¡Nivel Experto! Pareces todo un analista de AMI Fincas.</p>
                                ) : score >= 40 ? (
                                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">Buen intento. Aún puedes afinar un poco más el lápiz.</p>
                                ) : (
                                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">Quizá necesites estudiar un poco más el mercado murciano.</p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={startGame}
                                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-500 hover:to-teal-400 transition-all transform hover:-translate-y-0.5"
                                >
                                    Jugar de Nuevo
                                </button>
                                {!user ? (
                                    <Link to="/register" className="px-8 py-3 bg-white dark:bg-gray-800 border-2 border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                        Crear cuenta gratis
                                    </Link>
                                ) : (
                                    <Link to="/entretenimiento" className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                        Volver al menú
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ad block space - example of subtle branding */}
                <div className="mt-12 text-center opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Patrocinado por</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300">AMI Fincas</span>
                        <span className="text-gray-400 dark:text-gray-500 text-sm hidden sm:inline">| Excelencia Certificada 5.0 en Administración</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
