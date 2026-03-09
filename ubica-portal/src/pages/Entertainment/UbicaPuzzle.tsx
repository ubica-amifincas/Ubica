import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// --- Tetris Logic Core ---

// El tablero clásico de Tetris suele ser de 10x20
const COLS = 10;
const ROWS = 20;

// Definición de las piezas de Tetris (Tetrominos)
// Se usan matrices donde 1 indica el bloque y 0 vacío.
const TETROMINOS = {
    0: { shape: [[0]], color: 'bg-transparent text-transparent', border: 'border-transparent', name: 'Vacío' }, // Empty
    I: {
        shape: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        color: 'bg-cyan-500 text-cyan-100', // Cimientos
        border: 'border-cyan-600',
        name: 'Rascacielos'
    },
    J: {
        shape: [
            [0, 2, 0],
            [0, 2, 0],
            [2, 2, 0]
        ],
        color: 'bg-blue-600 text-blue-100',
        border: 'border-blue-700',
        name: 'Dúplex'
    },
    L: {
        shape: [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3]
        ],
        color: 'bg-orange-500 text-orange-100',
        border: 'border-orange-600',
        name: 'Adosado'
    },
    O: {
        shape: [
            [4, 4],
            [4, 4]
        ],
        color: 'bg-yellow-400 text-yellow-100',
        border: 'border-yellow-500',
        name: 'Parcela'
    },
    S: {
        shape: [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        color: 'bg-green-500 text-green-100',
        border: 'border-green-600',
        name: 'Jardín'
    },
    T: {
        shape: [
            [0, 0, 0],
            [6, 6, 6],
            [0, 6, 0]
        ],
        color: 'bg-purple-500 text-purple-100',
        border: 'border-purple-600',
        name: 'Edificio'
    },
    Z: {
        shape: [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ],
        color: 'bg-red-500 text-red-100',
        border: 'border-red-600',
        name: 'Industrial'
    }
};

type TetrominoType = keyof typeof TETROMINOS;

const randomTetromino = () => {
    const tetrominos = 'IJLOSTZ';
    const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)] as TetrominoType;
    return TETROMINOS[randTetromino];
};

type PlayerState = {
    pos: { x: number; y: number };
    tetromino: any[][];
    collided: boolean;
    type: TetrominoType;
};

// --- Custom Hooks para Tetris ---
const useBoard = (player: PlayerState, resetPlayer: () => void) => {
    const [board, setBoard] = useState(
        Array.from(Array(ROWS), () => new Array(COLS).fill([0, 'clear']))
    );
    const [rowsCleared, setRowsCleared] = useState(0);

    useEffect(() => {
        setRowsCleared(0);

        const sweepRows = (newBoard: any[]) => {
            let cleared = 0;
            const sweptBoard = newBoard.reduce((ack, row) => {
                // If row contains no 0s, it's full
                if (row.findIndex((cell: any) => cell[0] === 0) === -1) {
                    cleared += 1;
                    ack.unshift(new Array(COLS).fill([0, 'clear']));
                    return ack;
                }
                ack.push(row);
                return ack;
            }, []);

            if (cleared > 0) {
                setRowsCleared(cleared);
            }
            return sweptBoard;
        };

        const updateBoard = (prevBoard: any[]) => {
            // Flush the board
            const newBoard = prevBoard.map(row =>
                row.map((cell: any) => (cell[1] === 'clear' ? [0, 'clear'] : cell))
            );

            // Draw the tetromino
            player.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        if (
                            newBoard[y + player.pos.y] &&
                            newBoard[y + player.pos.y][x + player.pos.x] !== undefined
                        ) {
                            newBoard[y + player.pos.y][x + player.pos.x] = [
                                value,
                                `${player.collided ? 'merged' : 'clear'}`,
                                player.type // guardamos el tipo para colorear
                            ];
                        }
                    }
                });
            });

            // Check if we collided
            if (player.collided) {
                resetPlayer();
                return sweepRows(newBoard);
            }

            return newBoard;
        };

        setBoard(prev => updateBoard(prev));
    }, [player, resetPlayer]);

    return { board, setBoard, rowsCleared };
};


// Utils
const checkCollision = (player: PlayerState, board: any[], { x: moveX, y: moveY }: { x: number, y: number }) => {
    for (let y = 0; y < player.tetromino.length; y += 1) {
        for (let x = 0; x < player.tetromino[y].length; x += 1) {
            // Check that we're on an actual Tetromino cell
            if (player.tetromino[y][x] !== 0) {
                if (
                    // Check our move is inside the game areas height (y)
                    // We shouldn't go through the bottom of the play area
                    !board[y + player.pos.y + moveY] ||
                    // Check that our move is inside the game areas width (x)
                    !board[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
                    // Check that the cell we're moving to isn't set to clear
                    board[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !== 'clear'
                ) {
                    return true;
                }
            }
        }
    }
    return false;
};

// --- Componente Principal ---
export default function UbicaTetris() {
    const { user } = useAuth();

    const [dropTime, setDropTime] = useState<number | null>(null);
    const [gameOver, setGameOver] = useState(false);

    // Game Stats
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lines, setLines] = useState(0);

    const [bestScore, setBestScore] = useState(() => {
        return parseInt(localStorage.getItem('ubica_tetris_best') || '0');
    });

    const [player, setPlayer] = useState<PlayerState>({
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOS[0].shape,
        collided: false,
        type: 0,
    });

    const resetPlayer = useCallback(() => {
        const nextPiece = randomTetromino();
        setPlayer({
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: nextPiece.shape,
            collided: false,
            type: Object.keys(TETROMINOS).find(key => TETROMINOS[key as TetrominoType] === nextPiece) as TetrominoType
        });
    }, []);

    const { board, setBoard, rowsCleared } = useBoard(player, resetPlayer);

    // Score Calculation
    useEffect(() => {
        if (rowsCleared > 0) {
            // Original Tetris Nintendo scoring system based on level
            const linePoints = [40, 100, 300, 1200];
            const pointsEarned = linePoints[rowsCleared - 1] * level;

            setScore(prev => prev + pointsEarned);
            setLines(prev => prev + rowsCleared);
        }
    }, [rowsCleared, level]);

    // Level Up
    useEffect(() => {
        if (lines >= level * 10) {
            setLevel(prev => prev + 1);
            // Speed up the drop rate
            setDropTime(1000 / (level + 1) + 200);
        }
    }, [lines, level]);

    // Record Update
    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            localStorage.setItem('ubica_tetris_best', score.toString());
        }
    }, [score, bestScore]);


    const startGame = () => {
        setBoard(Array.from(Array(ROWS), () => new Array(COLS).fill([0, 'clear'])));
        setDropTime(1000);
        resetPlayer();
        setGameOver(false);
        setScore(0);
        setLevel(1);
        setLines(0);
    };

    const movePlayer = (dir: number) => {
        if (!checkCollision(player, board, { x: dir, y: 0 })) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x + dir, y: prev.pos.y } }));
        }
    };

    const drop = () => {
        // Aumentar score al hacer soft drop? 1 punto por fila
        setScore(prev => prev + 1);

        if (!checkCollision(player, board, { x: 0, y: 1 })) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x, y: prev.pos.y + 1 } }));
        } else {
            // Game Over check
            if (player.pos.y < 1) {
                console.log('GAME OVER!');
                setGameOver(true);
                setDropTime(null);
            } else {
                // Collide and merge
                setPlayer(prev => ({ ...prev, collided: true }));
            }
        }
    };

    // Keyboard support (Drop instantly/fast)
    const keyUp = ({ keyCode }: { keyCode: number }) => {
        if (!gameOver) {
            // ArrowDown
            if (keyCode === 40) {
                setDropTime(1000 / (level + 1) + 200);
            }
        }
    };

    const dropPlayer = () => {
        setDropTime(null);
        drop();
    };

    // Rotate Logic
    const rotate = (matrix: any[][], dir: number) => {
        // Transponer
        const rotatedTetro = matrix.map((_, index) =>
            matrix.map(col => col[index])
        );
        // Invertir
        if (dir > 0) return rotatedTetro.map(row => row.reverse());
        return rotatedTetro.reverse();
    };

    const playerRotate = (dir: number) => {
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

        // Check if rotating causes a collision (wall kick naive)
        const pos = clonedPlayer.pos.x;
        let offset = 1;
        while (checkCollision(clonedPlayer, board, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > clonedPlayer.tetromino[0].length) {
                // failed to rotate, revert
                rotate(clonedPlayer.tetromino, -dir);
                clonedPlayer.pos.x = pos;
                return;
            }
        }

        setPlayer(clonedPlayer);
    };

    // Use Interval Custom Hook for game loop
    const useInterval = (callback: () => void, delay: number | null) => {
        const savedCallback = useRef<() => void>();

        useEffect(() => {
            savedCallback.current = callback;
        }, [callback]);

        useEffect(() => {
            function tick() {
                if (savedCallback.current) savedCallback.current();
            }
            if (delay !== null) {
                const id = setInterval(tick, delay);
                return () => clearInterval(id);
            }
        }, [delay]);
    };

    useInterval(() => {
        drop();
    }, dropTime);

    // Keyboard Bindings
    const keyDown = (e: React.KeyboardEvent) => {
        if (gameOver) return;

        // Prevent default scroll
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (e.keyCode === 37) { // Left
            movePlayer(-1);
        } else if (e.keyCode === 39) { // Right
            movePlayer(1);
        } else if (e.keyCode === 40) { // Down
            dropPlayer();
        } else if (e.keyCode === 38) { // Up
            playerRotate(1);
        } else if (e.keyCode === 32) { // Space (Hard Drop)
            let tempY = player.pos.y;
            while (!checkCollision(player, board, { x: 0, y: tempY - player.pos.y + 1 })) {
                tempY++;
            }
            setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: tempY }, collided: true }));
            setScore(s => s + (tempY - player.pos.y) * 2); // 2 points per hard drop tile
        }
    };

    // Render Gate function
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex flex-col items-center justify-center p-4 transition-colors">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LockClosedIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Contenido Exclusivo</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">
                        El juego "Ubica Puzzle" requiere guardar tus récords inmobiliarios, por lo que solo está disponible para usuarios registrados.
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
        <div
            className="min-h-screen bg-[#faf8ef] dark:bg-slate-900 text-slate-800 dark:text-white pb-12 font-sans touch-none selection:bg-transparent overflow-hidden transition-colors duration-300"
            role="button"
            tabIndex={0}
            onKeyDown={keyDown}
            onKeyUp={keyUp}
            autoFocus
            style={{ outline: "none" }} // remove focus ring
        >
            {/* Header section */}
            <div className="bg-[#faf8ef] dark:bg-slate-800 shadow-xl border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 w-full mb-4 sm:mb-8 transition-colors duration-300">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/entretenimiento" className="flex items-center text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors font-bold text-sm">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline">Atrás</span>
                    </Link>
                    <div className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 flex items-center gap-2">
                        CONSTRUCTOR TETRIS
                    </div>
                    <div className="w-12"></div> {/* Spacer for centering */}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 w-full flex flex-col items-center">

                {/* Game Layout Desktop/Tablet Grid vs Mobile */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start justify-center w-full">

                    {/* Left Sidebar (Stats) */}
                    <div className="flex flex-row md:flex-col gap-4 w-full md:w-48 order-2 md:order-1 justify-center md:pt-12">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-b-4 border-gray-200 dark:border-slate-900 shadow-md dark:shadow-inner w-full text-center transition-colors">
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Mejor Obra</p>
                            <p className="text-2xl font-black font-mono">{bestScore}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-b-4 border-gray-200 dark:border-slate-900 shadow-md dark:shadow-inner w-full text-center transition-colors">
                            <p className="text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">Presupuesto</p>
                            <p className="text-2xl font-black font-mono">{score}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-b-4 border-gray-200 dark:border-slate-900 shadow-md dark:shadow-inner w-full text-center hidden md:block transition-colors">
                            <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">Nivel</p>
                            <p className="text-2xl font-black font-mono">{level}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-b-4 border-gray-200 dark:border-slate-900 shadow-md dark:shadow-inner w-full text-center hidden md:block transition-colors">
                            <p className="text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">Plantas Terminadas</p>
                            <p className="text-2xl font-black font-mono">{lines}</p>
                        </div>
                    </div>

                    {/* Main Stage (The Grid) */}
                    <div className="order-1 md:order-2 flex flex-col items-center relative gap-2">

                        {/* Board */}
                        <div
                            className="relative bg-[#ebe5da] dark:bg-slate-950 p-2 rounded-xl border-4 border-gray-300 dark:border-slate-700 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-colors"
                            style={{ width: "min(90vw, 320px)" }} // Responsive width max 320px
                        >
                            {/* The Grid lines overlay for aesthetic */}
                            <div className="absolute inset-2 grid grid-rows-20 grid-cols-10 pointer-events-none opacity-[0.05] dark:opacity-20 z-0 border border-slate-900 dark:border-white/5">
                                {Array.from({ length: ROWS * COLS }).map((_, i) => (
                                    <div key={`grid-${i}`} className="border-[0.5px] border-slate-900 dark:border-white/10" />
                                ))}
                            </div>

                            <div className="grid grid-rows-[repeat(20,minmax(0,1fr))] grid-cols-[repeat(10,minmax(0,1fr))] aspect-[1/2] w-full gap-[1px]">
                                {board.map((row, y) => row.map((cell, x) => {
                                    const isFilled = cell[0] !== 0;
                                    const tConfig = TETROMINOS[cell[2] as TetrominoType];
                                    return (
                                        <div
                                            key={`cell-${y}-${x}`}
                                            className={`relative z-10 w-full h-full rounded-sm ${isFilled ? `${tConfig.color} shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] scale-100` : 'bg-transparent scale-95'} transition-all duration-75 flex items-center justify-center overflow-hidden`}
                                        >
                                            {isFilled && (
                                                <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] opacity-80" fill="currentColor" textAnchor="middle">
                                                    {/* Abstract building element (windows/roof) */}
                                                    {cell[2] === 'O' && <path d="M10,40 L50,10 L90,40 L90,90 L10,90 Z" fill="rgba(255,255,255,0.4)" />}
                                                    {cell[2] !== 'O' && (
                                                        <>
                                                            <rect x="25" y="25" width="20" height="20" rx="3" fill="rgba(255,255,255,0.5)" />
                                                            <rect x="55" y="25" width="20" height="20" rx="3" fill="rgba(255,255,255,0.5)" />
                                                            <rect x="25" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.5)" />
                                                            <rect x="55" y="55" width="20" height="20" rx="3" fill="rgba(255,255,255,0.5)" />
                                                        </>
                                                    )}
                                                </svg>
                                            )}
                                        </div>
                                    )
                                }))}
                            </div>

                            {/* Overlays */}
                            <AnimatePresence>
                                {(!dropTime && !gameOver && score === 0) && (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-lg"
                                    >
                                        <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-all outline-none border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1">
                                            INICIAR OBRA
                                        </button>
                                        <p className="mt-6 text-slate-600 dark:text-slate-400 text-sm hidden md:block font-bold">Usa las flechas del teclado</p>
                                    </motion.div>
                                )}
                                {gameOver && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-red-100/90 dark:bg-red-900/90 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-lg border-2 border-red-500"
                                    >
                                        <h2 className="text-3xl font-black text-red-600 dark:text-white mb-2 tracking-widest text-center">OBRA<br />PAUSADA</h2>
                                        <p className="text-red-800 dark:text-red-200 mb-6 font-mono text-xl font-bold">Presupuesto: {score}</p>
                                        <button onClick={startGame} className="bg-white text-red-600 hover:bg-red-50 font-black text-lg px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 border border-red-200">
                                            <ArrowPathIcon className="w-5 h-5 font-bold" />
                                            REINICIAR
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Sidebar (Controls for Mobile Only) */}
                    <div className="md:hidden flex flex-col w-full gap-4 order-3 pb-8 px-2 max-w-[320px]">
                        <div className="flex justify-between gap-2">
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.preventDefault(); playerRotate(-1); }} className="bg-white dark:bg-slate-700/80 active:bg-gray-100 dark:active:bg-slate-600 text-gray-800 dark:text-white p-4 rounded-xl flex-1 touch-manipulation backdrop-blur-sm border-b-4 border-gray-300 dark:border-slate-900 shadow-sm active:border-b-0 active:translate-y-1 transition-all">
                                    <span className="text-xl font-black">↺</span>
                                </button>
                                <button onClick={(e) => { e.preventDefault(); playerRotate(1); }} className="bg-white dark:bg-slate-700/80 active:bg-gray-100 dark:active:bg-slate-600 text-gray-800 dark:text-white p-4 rounded-xl flex-1 touch-manipulation backdrop-blur-sm border-b-4 border-gray-300 dark:border-slate-900 shadow-sm active:border-b-0 active:translate-y-1 transition-all">
                                    <span className="text-xl font-black">↻</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={(e) => { e.preventDefault(); movePlayer(-1); }} className="bg-white dark:bg-slate-700/80 active:bg-gray-100 dark:active:bg-slate-600 text-gray-800 dark:text-white p-5 rounded-xl touch-manipulation backdrop-blur-sm border-b-4 border-gray-300 dark:border-slate-900 shadow-sm active:border-b-0 active:translate-y-1 flex items-center justify-center transition-all">
                                <span className="text-2xl font-bold">←</span>
                            </button>
                            <button
                                onPointerDown={(e) => { e.preventDefault(); dropPlayer(); }}
                                onPointerUp={() => { setDropTime(1000 / (level + 1) + 200); }}
                                onPointerLeave={() => { setDropTime(1000 / (level + 1) + 200); }}
                                className="bg-gray-100 dark:bg-slate-600/80 active:bg-gray-200 dark:active:bg-slate-500 text-gray-800 dark:text-white p-5 rounded-xl touch-manipulation backdrop-blur-sm border-b-4 border-gray-300 dark:border-slate-900 shadow-sm active:border-b-0 active:translate-y-1 flex items-center justify-center transition-all"
                            >
                                <span className="text-2xl font-bold">↓</span>
                            </button>
                            <button onClick={(e) => { e.preventDefault(); movePlayer(1); }} className="bg-white dark:bg-slate-700/80 active:bg-gray-100 dark:active:bg-slate-600 text-gray-800 dark:text-white p-5 rounded-xl touch-manipulation backdrop-blur-sm border-b-4 border-gray-300 dark:border-slate-900 shadow-sm active:border-b-0 active:translate-y-1 flex items-center justify-center transition-all">
                                <span className="text-2xl font-bold">→</span>
                            </button>
                        </div>

                        {/* Hard Drop Button */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                let tempY = player.pos.y;
                                while (!checkCollision(player, board, { x: 0, y: tempY - player.pos.y + 1 })) {
                                    tempY++;
                                }
                                setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: tempY }, collided: true }));
                                setScore(s => s + (tempY - player.pos.y) * 2);
                            }}
                            className="bg-emerald-600/90 active:bg-emerald-500 p-4 rounded-xl flex w-full justify-center touch-manipulation backdrop-blur-sm border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 text-emerald-50 font-black tracking-widest shadow-md transition-all"
                        >
                            CAÍDA RÁPIDA
                        </button>
                    </div>

                    {/* Right sidebar desktop legend - Decorative */}
                    <div className="hidden md:flex flex-col gap-3 w-48 order-3 pt-12">
                        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Tipos de Viga</h3>
                        {Object.keys(TETROMINOS).filter(key => key !== '0').map((key) => {
                            const t = TETROMINOS[key as TetrominoType];
                            return (
                                <div key={key} className="flex items-center gap-3 bg-white dark:bg-slate-800/50 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-transparent transition-colors">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center shadow-inner ${t.color}`}>
                                        {/* Tiny abstract SVG for the legend */}
                                        <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] opacity-80" fill="currentColor">
                                            {key === 'O' ? (
                                                <path d="M10,40 L50,10 L90,40 L90,90 L10,90 Z" fill="rgba(255,255,255,0.4)" />
                                            ) : (
                                                <>
                                                    <rect x="20" y="20" width="25" height="25" rx="3" fill="rgba(255,255,255,0.5)" />
                                                    <rect x="55" y="20" width="25" height="25" rx="3" fill="rgba(255,255,255,0.5)" />
                                                    <rect x="20" y="55" width="25" height="25" rx="3" fill="rgba(255,255,255,0.5)" />
                                                    <rect x="55" y="55" width="25" height="25" rx="3" fill="rgba(255,255,255,0.5)" />
                                                </>
                                            )}
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
