import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { Environment, PerspectiveCamera, OrbitControls, ContactShadows, Text, Edges } from '@react-three/drei';
import { ChevronLeftIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as THREE from 'three';

// --- GAME LOGIC STATE ---
interface BlockData {
    id: string;
    position: [number, number, number];
    color: string;
    type: 'base' | 'building';
}

// Configuración visual de la marca
const BLOCK_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#6366f1', // indigo-500
    '#0ea5e9', // sky-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
];

// --- 3D COMPONENTS ---

// 1. La Base Fija (Suelo)
function BasePlatform() {
    return (
        <RigidBody type="fixed" friction={1} restitution={0.1} position={[0, -0.5, 0]}>
            <mesh receiveShadow>
                <boxGeometry args={[5, 1, 5]} />
                <meshStandardMaterial color="#cbd5e1" />
                <Edges scale={1} threshold={15} color="#94a3b8" />
            </mesh>
        </RigidBody>
    );
}

// 2. Grúa (Spawner Automático que oscila)
function Crane({ onDrop, isSpawning, targetY }: { onDrop: (x: number, z: number, y: number) => void, isSpawning: boolean, targetY: number }) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Posición Y de la grúa: siempre 5 metros por encima del edificio más alto
    // Posición X y Z: oscilan con el tiempo

    useFrame((state) => {
        if (!meshRef.current) return;

        // Animación de oscilación pendular suavizada (Lissajous curve base)
        const t = state.clock.getElapsedTime();
        const x = Math.sin(t * 1.5) * 3;
        const z = Math.cos(t * 1.2) * 1.5;

        // Interpolamos suavemente la altura (Y) de la cámara y la grúa
        meshRef.current.position.set(x, targetY + 6, z);
    });

    // Hacemos que la pantalla reaccione al clic/Toque
    useEffect(() => {
        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            // Prevenir dropear si estamos haciendo clic en algún botón HTML de la UI
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'button' || (e.target as HTMLElement).closest('button')) return;
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'a' || (e.target as HTMLElement).closest('a')) return;

            if (!isSpawning && meshRef.current) {
                onDrop(meshRef.current.position.x, meshRef.current.position.z, meshRef.current.position.y);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [onDrop, isSpawning]);

    return (
        <mesh ref={meshRef} castShadow>
            <boxGeometry args={[1.5, 0.5, 1.5]} />
            <meshStandardMaterial color={isSpawning ? "#ef4444" : "#10b981"} opacity={0.6} transparent />
            <Edges scale={1} threshold={15} color={isSpawning ? "#991b1b" : "#047857"} />

            {/* Guía láser hacia el suelo */}
            <mesh position={[0, -5, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 10, 8]} />
                <meshBasicMaterial color={isSpawning ? "#ef4444" : "#10b981"} transparent opacity={0.3} />
            </mesh>
        </mesh>
    );
}

// 3. Bloques que caen (Edificios)
function BuildingBlock({ position, color, id, onFallOut }: { position: [number, number, number], color: string, id: string, onFallOut: () => void }) {
    const rigidBodyRef = useRef<any>(null); // Type 'any' para evitar conflictos con la última versión de Rapier Types

    useFrame(() => {
        if (!rigidBodyRef.current) return;
        // Check if block has fallen off the base
        const currentPos = rigidBodyRef.current.translation();
        if (currentPos.y < -5) {
            onFallOut();
        }
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            type="dynamic"
            position={position}
            mass={1}
            friction={0.8}
            restitution={0.1}
            linearDamping={0.5}
            angularDamping={0.5}
            canSleep={false} // Evitar que se desactiven por error
        >
            <mesh castShadow receiveShadow>
                {/* Geometría que parece un rascacielos base */}
                <boxGeometry args={[1.5, 1, 1.5]} />
                <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
                <Edges scale={1} threshold={15} color="#0f172a" />

                {/* Detalles Abstractos (Ventanas) usando geometrías extra */}
                <mesh position={[0, 0, 0.751]}>
                    <planeGeometry args={[1.2, 0.6]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
                </mesh>
                <mesh position={[0, 0, -0.751]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[1.2, 0.6]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
                </mesh>
            </mesh>
        </RigidBody>
    );
}

// 4. Controlador de Cámara Dinámico
function CameraRig({ targetY }: { targetY: number }) {
    const { camera } = useThree();

    useFrame(() => {
        // Suavizar el movimiento de la cámara a medida que la torre sube
        const desiredY = Math.max(8, targetY + 6);
        const desiredZ = Math.max(12, targetY + 8);

        camera.position.lerp(new THREE.Vector3(0, desiredY, desiredZ), 0.05);
        camera.lookAt(0, targetY / 2, 0); // Mirar al centro de la torre
    });

    return null;
}

// --- MAIN UX COMPONENT ---
export default function UbicaBalance() {
    const { user } = useAuth();

    const [blocks, setBlocks] = useState<BlockData[]>([]);
    const [highestY, setHighestY] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(() => {
        return parseInt(localStorage.getItem('ubica_balance_best') || '0');
    });

    // Temporizador para no spamear bloques (cooldown)
    const [isSpawning, setIsSpawning] = useState(false);

    // Update records
    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            localStorage.setItem('ubica_balance_best', score.toString());
        }
    }, [score, bestScore]);

    // Derrota
    const handleFallOut = useCallback(() => {
        if (!gameOver) {
            setGameOver(true);
        }
    }, [gameOver]);

    // Soltar bloque nuevo
    const handleDrop = useCallback((x: number, z: number, y: number) => {
        if (gameOver || isSpawning) return;

        setIsSpawning(true);
        const newBlock: BlockData = {
            id: `block-${Date.now()}`,
            position: [x, y, z],
            color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
            type: 'building'
        };

        setBlocks(prev => {
            const newArray = [...prev, newBlock];
            setScore(newArray.length);
            // Atualizamos roughly la altura esperada de la pila
            setHighestY(newArray.length * 0.8);
            return newArray;
        });

        // Cooldown para no poner infinitos a la vez
        setTimeout(() => {
            setIsSpawning(false);
        }, 1000);
    }, [gameOver, isSpawning]);

    const restartGame = () => {
        setBlocks([]);
        setHighestY(0);
        setScore(0);
        setGameOver(false);
        setIsSpawning(false);
    };

    // Auth Guard
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 flex flex-col items-center justify-center p-4 transition-colors">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LockClosedIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">La Torre Fincas (Beta 3D)</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                        "Ubica Balance" es una experiencia 3D experimental con simulación física real. Solo disponible para agentes registrados debido al guardado del ranking global.
                    </p>
                    <Link
                        to="/register"
                        className="block w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        Únete gratis
                    </Link>
                    <Link
                        to="/entretenimiento"
                        className="block w-full mt-4 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                        Volver al menú de juegos
                    </Link>
                </div>
            </div>
        );
    }

    // --- MAIN RENDER ---
    return (
        <div className="w-full h-screen relative bg-gradient-to-b from-sky-400 to-sky-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden font-sans select-none touch-none">

            {/* HUD & UI */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-10 pointer-events-none">
                <div>
                    <Link to="/entretenimiento" className="flex items-center text-white/80 hover:text-white font-bold bg-black/20 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto transition-all hover:bg-black/40">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Salir
                    </Link>
                </div>
                <div className="flex gap-2">
                    <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-3 text-center pointer-events-auto border border-white/10 shadow-xl">
                        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Récord Mundial</h3>
                        <p className="text-white text-2xl font-black font-mono leading-none">{bestScore} <span className="text-sm font-medium">pisos</span></p>
                    </div>
                    <div className="bg-emerald-600/90 backdrop-blur-md rounded-2xl px-6 py-3 text-center pointer-events-auto shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/30">
                        <h3 className="text-emerald-100/80 text-[10px] font-black uppercase tracking-widest mb-1">Tu Torre Actual</h3>
                        <p className="text-white text-3xl font-black font-mono leading-none">{score}</p>
                    </div>
                </div>
            </div>

            {/* Instrucciones Centradas */}
            {score === 0 && !gameOver && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none opacity-80 animate-pulse">
                    <h2 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-tight mb-2">Ubica Balance</h2>
                    <p className="text-white/90 text-lg md:text-xl font-medium drop-shadow-md bg-black/20 px-6 py-2 rounded-full inline-block backdrop-blur-sm">
                        Toca la pantalla para soltar un edificio. ¡Construye alto!
                    </p>
                </div>
            )}

            {/* Fin del Juego */}
            {gameOver && (
                <div className="absolute inset-0 bg-red-900/60 dark:bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 transition-all duration-500">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-[90%] text-center border-t-8 border-red-500 transform scale-100 animate-bounce-in">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">¡Derrumbe!</h2>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">Tu torre colapsó por mala planificación inmobiliaria.</p>

                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-8">
                            <span className="block text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Altura Máxima Alcanzada</span>
                            <span className="text-5xl font-black text-emerald-600">{score}</span>
                        </div>

                        <button
                            onClick={restartGame}
                            className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-emerald-500 hover:scale-105 transition-all outline-none"
                        >
                            Construir de Nuevo
                        </button>
                    </div>
                </div>
            )}

            {/* 3D RENDER ENGINE */}
            {/* Suspendemos Canvas hasta que React esté listo para montar contexto 3D y evitamos parpadeos */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 50 }}>
                {/* Entorno y Luces */}
                <color attach="background" args={['transparent']} />

                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 20, 10]}
                    castShadow
                    intensity={1.5}
                    shadow-mapSize={[1024, 1024]}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                />
                <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#333333" />

                {/* Físicas y Objetos */}
                <Physics gravity={[0, -9.81, 0]}>
                    <BasePlatform />

                    {/* Renderizamos todos los bloques inertes */}
                    {blocks.map((block) => (
                        <BuildingBlock
                            key={block.id}
                            id={block.id}
                            position={block.position}
                            color={block.color}
                            onFallOut={handleFallOut}
                        />
                    ))}

                    {/* Controlador de Cámara */}
                    <CameraRig targetY={highestY} />
                </Physics>

                {/* Grúa (Fuera de las físicas para moverse libremente con código, solo es visual y marca coordenadas) */}
                {!gameOver && (
                    <Crane onDrop={handleDrop} isSpawning={isSpawning} targetY={highestY} />
                )}

                {/* Sombra de Contacto Global Decorativa */}
                <ContactShadows position={[0, -0.49, 0]} opacity={0.4} scale={20} blur={2} far={10} />

                {/* Entorno Visual de Cielos bonitos (Atardecer por ejemplo) */}
                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
