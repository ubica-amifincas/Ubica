import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, PuzzlePieceIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// 2048 Logic Core
type Grid = number[][];

const GRID_SIZE = 4;

const initializeGrid = (): Grid => {
    let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    return grid;
};

const getEmptyCoordinates = (grid: Grid) => {
    const emptyCoords: { r: number, c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) {
                emptyCoords.push({ r, c });
            }
        }
    }
    return emptyCoords;
};

const addRandomTile = (grid: Grid): Grid => {
    const emptyCoords = getEmptyCoordinates(grid);
    if (emptyCoords.length === 0) return grid;

    const randomCoord = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[randomCoord.r][randomCoord.c] = Math.random() > 0.9 ? 4 : 2;
    return newGrid;
};

const hasMovesLeft = (grid: Grid): boolean => {
    // Check for empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return true;
        }
    }
    // Check for possible merges horizontally and vertically
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
            if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
        }
    }
    return false;
};

// UI Mapping for the Real Estate theme
const TILE_CONFIG: Record<number, { name: string, bg: string, text: string, textSm: string }> = {
    2: { name: 'Ladrillo', bg: 'bg-[#f0e4d4]', text: 'text-[#776e65]', textSm: 'text-xs' },
    4: { name: 'Pared', bg: 'bg-[#ede0c8]', text: 'text-[#776e65]', textSm: 'text-xs' },
    8: { name: 'Habitación', bg: 'bg-[#f2b179]', text: 'text-white', textSm: 'text-[10px]' },
    16: { name: 'Estudio', bg: 'bg-[#f59563]', text: 'text-white', textSm: 'text-xs' },
    32: { name: 'Casa', bg: 'bg-[#f67c5f]', text: 'text-white', textSm: 'text-xs' },
    64: { name: 'Chalet', bg: 'bg-[#f65e3b]', text: 'text-white', textSm: 'text-xs' },
    128: { name: 'Edificio', bg: 'bg-[#edcf72]', text: 'text-white', textSm: 'text-[10px]' },
    256: { name: 'Rascacielos', bg: 'bg-[#edcc61]', text: 'text-white', textSm: 'text-[9px]' },
    512: { name: 'Barrio', bg: 'bg-[#edc850]', text: 'text-white', textSm: 'text-xs' },
    1024: { name: 'Ciudad', bg: 'bg-[#edc53f]', text: 'text-white', textSm: 'text-xs' },
    2048: { name: 'Imperio', bg: 'bg-[#edc22e]', text: 'text-white', textSm: 'text-xs' },
};

export default function UbicaPuzzle() {
    const { user } = useAuth();

    const [grid, setGrid] = useState<Grid>(initializeGrid());
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        // En un caso real, esto vendría de la DB del usuario.
        return parseInt(localStorage.getItem('ubica_puzzle_best') || '0');
    });
    const [gameOver, setGameOver] = useState(false);

    // Touch controls for mobile adaptation
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    // Persist best score
    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            localStorage.setItem('ubica_puzzle_best', score.toString());
        }
    }, [score, bestScore]);

    const handleRestart = () => {
        setGrid(initializeGrid());
        setScore(0);
        setGameOver(false);
    };

    const move = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        if (gameOver) return;

        let newGrid = JSON.parse(JSON.stringify(grid));
        let pointsEarned = 0;
        let moved = false;

        const slide = (row: number[]) => {
            let arr = row.filter(val => val);
            let missing = GRID_SIZE - arr.length;
            let zeros = Array(missing).fill(0);
            return arr.concat(zeros);
        };

        const combine = (row: number[]) => {
            for (let i = 0; i < GRID_SIZE - 1; i++) {
                if (row[i] !== 0 && row[i] === row[i + 1]) {
                    row[i] *= 2;
                    row[i + 1] = 0;
                    pointsEarned += row[i];
                }
            }
            return row;
        };

        if (direction === 'LEFT') {
            for (let r = 0; r < GRID_SIZE; r++) {
                let row = newGrid[r];
                let original = [...row];
                row = slide(row);
                row = combine(row);
                row = slide(row);
                newGrid[r] = row;
                if (original.join(',') !== row.join(',')) moved = true;
            }
        } else if (direction === 'RIGHT') {
            for (let r = 0; r < GRID_SIZE; r++) {
                let row = newGrid[r];
                let original = [...row];
                row.reverse();
                row = slide(row);
                row = combine(row);
                row = slide(row);
                row.reverse();
                newGrid[r] = row;
                if (original.join(',') !== row.join(',')) moved = true;
            }
        } else if (direction === 'UP') {
            for (let c = 0; c < GRID_SIZE; c++) {
                let col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
                let original = [...col];
                col = slide(col);
                col = combine(col);
                col = slide(col);
                for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = col[r];
                if (original.join(',') !== col.join(',')) moved = true;
            }
        } else if (direction === 'DOWN') {
            for (let c = 0; c < GRID_SIZE; c++) {
                let col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
                let original = [...col];
                col.reverse();
                col = slide(col);
                col = combine(col);
                col = slide(col);
                col.reverse();
                for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = col[r];
                if (original.join(',') !== col.join(',')) moved = true;
            }
        }

        if (moved) {
            newGrid = addRandomTile(newGrid);
            setGrid(newGrid);
            setScore(s => s + pointsEarned);

            if (!hasMovesLeft(newGrid)) {
                setGameOver(true);
            }
        }
    }, [grid, gameOver]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevenir scroll
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp': move('UP'); break;
                case 'ArrowDown': move('DOWN'); break;
                case 'ArrowLeft': move('LEFT'); break;
                case 'ArrowRight': move('RIGHT'); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        // Limpieza
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move]);

    // Touch support (Mobile adaptation)
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.x;
        const dy = touchEnd.y - touchStart.y;

        // Prevent accidental minimal swipes
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0) move('RIGHT');
            else move('LEFT');
        } else {
            // Vertical swipe
            if (dy > 0) move('DOWN');
            else move('UP');
        }
        setTouchStart(null);
    };

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
                        Volver al menú
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf8ef] dark:bg-gray-900 pb-12 font-sans touch-none selection:bg-transparent">
            {/* Header section optimized for mobile (sticky) */}
            <div className="bg-[#faf8ef] dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 w-full mb-6">
                <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/entretenimiento" className="flex items-center text-[#776e65] hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors font-bold text-sm">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Atrás
                    </Link>
                    <div className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center gap-2">
                        <PuzzlePieceIcon className="w-6 h-6 text-indigo-500" />
                        <span className="hidden sm:inline">Ubica Puzzle</span>
                    </div>
                    <button
                        onClick={handleRestart}
                        className="p-2 bg-[#8f7a66] text-white rounded font-bold hover:bg-[#9f8b77] transition-colors flex items-center gap-1 text-sm shadow-md"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Nuevo</span>
                    </button>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 w-full">
                {/* Score Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black text-[#776e65] dark:text-white leading-none mb-1">2048</h1>
                        <p className="text-[#776e65] dark:text-gray-300 font-medium text-sm sm:text-base leading-tight">
                            Une recursos hasta crear el <br className="sm:hidden" /><span className="font-bold text-indigo-500">Imperio Inmobiliario</span>.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-[#bbada0] dark:bg-gray-800 rounded px-4 sm:px-6 py-1 sm:py-2 text-center shadow-inner flex flex-col justify-center min-w-[70px] sm:min-w-[80px]">
                            <div className="text-[#eee4da] font-bold text-[10px] sm:text-xs uppercase tracking-wider leading-tight">Puntos</div>
                            <div className="text-white font-black text-lg sm:text-xl leading-none">{score}</div>
                        </div>
                        <div className="bg-[#bbada0] dark:bg-gray-800 rounded px-4 sm:px-6 py-1 sm:py-2 text-center shadow-inner flex flex-col justify-center min-w-[70px] sm:min-w-[80px]">
                            <div className="text-[#eee4da] font-bold text-[10px] sm:text-xs uppercase tracking-wider leading-tight">Récord</div>
                            <div className="text-white font-black text-lg sm:text-xl leading-none">{bestScore}</div>
                        </div>
                    </div>
                </div>

                {/* Game Board Container */}
                <div className="relative w-full max-w-[400px] mx-auto aspect-square bg-[#bbada0] rounded-lg p-2 sm:p-3 shadow-2xl">

                    {/* Game Over Overlay */}
                    <AnimatePresence>
                        {gameOver && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[#eee4da]/70 dark:bg-gray-900/80 z-10 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm"
                            >
                                <h2 className="text-4xl font-black text-[#776e65] dark:text-white mb-4 drop-shadow-md">¡Juego Terminado!</h2>
                                <button
                                    onClick={handleRestart}
                                    className="bg-[#8f7a66] text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-[#9f8b77] hover:scale-105 transition-all text-xl"
                                >
                                    Intentarlo de nuevo
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* The Grid */}
                    <div
                        className="grid grid-cols-4 grid-rows-4 gap-2 sm:gap-3 w-full h-full"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {grid.map((row, rIndex) =>
                            row.map((cellValue, cIndex) => {
                                // Background empty cell
                                const config = TILE_CONFIG[cellValue] || { name: cellValue.toString(), bg: 'bg-[#3c3a32]', text: 'text-[#f9f6f2]', textSm: 'text-sm' };
                                const isEmpty = cellValue === 0;

                                return (
                                    <div key={`${rIndex}-${cIndex}`} className="relative w-full h-full bg-[#eee4da]/40 dark:bg-gray-700/50 rounded-md">
                                        {!isEmpty && (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className={`absolute inset-0 flex flex-col items-center justify-center rounded-md font-bold shadow-sm ${config.bg} ${config.text}`}
                                            >
                                                {/* Hidden numeric value for debugging / standard 2048 feel if prefered */}
                                                <span className="hidden opacity-50 pb-1 leading-none">{cellValue}</span>
                                                <span className={`${config.textSm} font-black sm:text-base px-1 text-center truncate w-full leading-tight`}>{config.name}</span>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 text-[#776e65] dark:text-gray-400 text-sm sm:text-base p-4 sm:p-0">
                    <p className="mb-2"><strong className="text-gray-800 dark:text-gray-200">CÓMO JUGAR:</strong> Utiliza las <strong>flechas de dirección</strong> del teclado o <strong>desliza el dedo (swipe)</strong> en la pantalla para mover las piezas.</p>
                    <p>Cuando dos propiedades idénticas se tocan, <strong>¡se fusionan en una propiedad de mayor valor!</strong></p>
                </div>

                {/* Ad block space - example of subtle branding */}
                <div className="mt-12 text-center opacity-70 hover:opacity-100 transition-opacity pb-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Patrocinado por</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-300">AMI Fincas</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs hidden sm:inline">| Excelencia Certificada 5.0 en Administración</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
