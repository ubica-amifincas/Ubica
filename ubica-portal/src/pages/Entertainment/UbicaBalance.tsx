import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { Environment, ContactShadows, Edges } from '@react-three/drei';
import { ChevronLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// --- GAME LOGIC STATE ---
interface BlockData {
    id: string;
    position: [number, number, number];
    color: string;
    type: 'base' | 'building';
}

// Brand Colors
const BLOCK_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#6366f1', // indigo-500
    '#0ea5e9', // sky-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
];

// --- 3D COMPONENTS ---

// 1. Base Platform
function BasePlatform() {
    return (
        <RigidBody type="fixed" friction={1} restitution={0.1} position={[0, -0.5, 0]}>
            <mesh receiveShadow>
                <boxGeometry args={[5, 1, 5]} />
                <meshStandardMaterial color="#cbd5e1" />
                <Edges scale={1} threshold={15} color="#64748b" />
            </mesh>
        </RigidBody>
    );
}

// 2. Construction Drone (Replaces Crane)
function ConstructionDrone({ onDrop, isSpawning, targetY, difficultySpeed }: { onDrop: (x: number, z: number, y: number) => void, isSpawning: boolean, targetY: number, difficultySpeed: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const laserRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!groupRef.current) return;

        const t = state.clock.getElapsedTime();
        // Speed up based on difficulty
        const speed = 1.2 * difficultySpeed;
        const x = Math.sin(t * speed) * 3.5;
        const z = Math.cos(t * speed * 0.8) * 1.5;

        // Drone realistic tilt
        const tiltX = Math.cos(t * speed) * 0.15;
        const tiltZ = Math.sin(t * speed * 0.8) * -0.15;

        groupRef.current.position.set(x, targetY + 6, z);
        groupRef.current.rotation.set(tiltZ, t * 1.5, tiltX);

        if (laserRef.current) {
            const material = laserRef.current.material as THREE.MeshBasicMaterial;
            material.opacity = isSpawning ? 0.8 : 0.2 + Math.sin(t * 10) * 0.1;
        }
        
        if (ringRef.current) {
             const mat = ringRef.current.material as THREE.MeshStandardMaterial;
             mat.emissiveIntensity = isSpawning ? 3 : 1 + Math.sin(t * 5) * 0.5;
        }
    });

    useEffect(() => {
        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'button' || (e.target as HTMLElement).closest('button')) return;
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'a' || (e.target as HTMLElement).closest('a')) return;

            if (!isSpawning && groupRef.current) {
                onDrop(groupRef.current.position.x, groupRef.current.position.z, groupRef.current.position.y);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [onDrop, isSpawning]);

    return (
        <group ref={groupRef}>
            {/* Main Body */}
            <mesh castShadow>
                <cylinderGeometry args={[0.8, 0.6, 0.4, 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
            </mesh>
            
            {/* Glowing Ring */}
            <mesh ref={ringRef}>
                <torusGeometry args={[1, 0.05, 16, 32]} />
                <meshStandardMaterial color={isSpawning ? "#ef4444" : "#10b981"} emissive={isSpawning ? "#ef4444" : "#10b981"} emissiveIntensity={2} />
            </mesh>

            {/* Rotors */}
            {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((rot, i) => (
                <mesh key={i} position={[Math.cos(rot)*1.1, 0.1, Math.sin(rot)*1.1]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
                    <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5}/>
                </mesh>
            ))}

            {/* Holographic Laser */}
            <mesh ref={laserRef} position={[0, -10, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 20, 8]} />
                <meshBasicMaterial color={isSpawning ? "#ef4444" : "#10b981"} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
}

// 3. Falling Blocks
function BuildingBlock({ position, color, onFallOut }: { position: [number, number, number], color: string, id: string, onFallOut: () => void }) {
    const rigidBodyRef = useRef<any>(null);

    useFrame(() => {
        if (!rigidBodyRef.current) return;
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
            mass={1.5}
            friction={0.9}
            restitution={0.05}
            linearDamping={0.5}
            angularDamping={0.5}
            canSleep={false}
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[1.5, 1, 1.5]} />
                <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
                <Edges scale={1} threshold={15} color="#0f172a" />

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

// 4. Dynamic Camera
function CameraRig({ targetY }: { targetY: number }) {
    const { camera } = useThree();

    useFrame(() => {
        const desiredY = Math.max(8, targetY + 6);
        const desiredZ = Math.max(12, targetY + 10);

        camera.position.lerp(new THREE.Vector3(0, desiredY, desiredZ), 0.05);
        camera.lookAt(0, targetY / 2, 0);
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

    const [isSpawning, setIsSpawning] = useState(false);
    const [comboText, setComboText] = useState("");
    const [comboMultiplier, setComboMultiplier] = useState(1);
    const [difficultySpeed, setDifficultySpeed] = useState(1);
    const [scoreAnimation, setScoreAnimation] = useState(false);

    useEffect(() => {
        if (score > bestScore) {
            setBestScore(score);
            localStorage.setItem('ubica_balance_best', score.toString());
        }
    }, [score, bestScore]);

    const handleFallOut = useCallback(() => {
        if (!gameOver) {
            setGameOver(true);
        }
    }, [gameOver]);

    const handleDrop = useCallback((x: number, z: number, y: number) => {
        if (gameOver || isSpawning) return;

        setIsSpawning(true);

        // Combo Logic based on drop precision to origin (0,0)
        const dist = Math.hypot(x, z);
        let pts = 1;
        let txt = "";

        if (dist < 0.3) {
            pts = 3 * comboMultiplier;
            txt = `¡PERFECTO! +${pts}`;
            setComboMultiplier(prev => Math.min(prev + 1, 5));
        } else if (dist < 0.8) {
            pts = 2 * comboMultiplier;
            txt = `¡GENIAL! +${pts}`;
            setComboMultiplier(1);
        } else {
            pts = 1;
            txt = "";
            setComboMultiplier(1);
        }

        if (txt) {
            setComboText(txt);
            setTimeout(() => setComboText(""), 1200);
        }

        const newBlock: BlockData = {
            id: `block-${Date.now()}`,
            position: [x, y, z],
            color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
            type: 'building'
        };

        setBlocks(prev => {
            const newArray = [...prev, newBlock];
            
            setScore(s => s + pts);
            setScoreAnimation(true);
            setTimeout(() => setScoreAnimation(false), 200);
            
            setHighestY(newArray.length * 1.0); // Rough height estimate
            
            // Increase diff
            setDifficultySpeed(1 + (newArray.length * 0.05));
            return newArray;
        });

        setTimeout(() => {
            setIsSpawning(false);
        }, 800);
    }, [gameOver, isSpawning, comboMultiplier]);

    const restartGame = () => {
        setBlocks([]);
        setHighestY(0);
        setScore(0);
        setGameOver(false);
        setIsSpawning(false);
        setComboMultiplier(1);
        setComboText("");
        setDifficultySpeed(1);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 flex flex-col items-center justify-center p-4 transition-colors">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LockClosedIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">La Torre Fincas (Beta 3D)</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                        "Ubica Balance" es una experiencia 3D. Solo disponible para agentes registrados debido al guardado del ranking.
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

    return (
        <div className="w-full h-screen relative bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155] overflow-hidden font-sans select-none touch-none">

            {/* HUD & UI - Rediseñado y responsivo */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-wrap gap-4 justify-between items-start z-10 pointer-events-none">
                <div className="w-full sm:w-auto flex justify-between sm:block">
                    <Link to="/entretenimiento" className="flex items-center text-white/80 hover:text-white font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto transition-all hover:bg-white/20 border border-white/10">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Salir
                    </Link>
                </div>
                
                <div className="flex gap-2 sm:gap-4 ml-auto">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl px-4 py-2 sm:px-6 sm:py-3 text-center pointer-events-auto border border-white/10 shadow-xl hidden sm:block">
                        <h3 className="text-white/60 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Récord Mundial</h3>
                        <p className="text-white text-xl sm:text-2xl font-black font-mono leading-none">{bestScore} <span className="text-xs font-medium">pts</span></p>
                    </div>
                    
                    <motion.div 
                        animate={scoreAnimation ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-br from-emerald-500/90 to-teal-600/90 backdrop-blur-md rounded-2xl px-5 py-2 sm:px-6 sm:py-3 text-center pointer-events-auto shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 min-w-[100px]"
                    >
                        <h3 className="text-emerald-50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Tu Torre</h3>
                        <p className="text-white text-2xl sm:text-3xl font-black font-mono leading-none">{score}</p>
                    </motion.div>
                </div>
            </div>

            {/* Texto Flotante de Combos */}
            <AnimatePresence>
                {comboText && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1.2, y: -20 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none font-black text-4xl sm:text-5xl md:text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] whitespace-nowrap text-center
                        ${comboText.includes('PERFECTO') ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                        {comboText}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instrucciones Centradas */}
            {blocks.length === 0 && !gameOver && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none opacity-80 animate-pulse w-[90%] md:w-auto">
                    <h2 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tight mb-4">Ubica Balance</h2>
                    <p className="text-white/90 text-sm sm:text-lg font-medium drop-shadow-md bg-black/40 px-6 py-3 rounded-full inline-block backdrop-blur-sm border border-white/10">
                        Toca la pantalla para soltar. ¡Cerca del centro da más puntos!
                    </p>
                </div>
            )}

            {/* Pantalla Final Premium */}
            <AnimatePresence>
                {gameOver && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-xl flex flex-col items-center justify-center z-30"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-white/10 p-8 sm:p-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-[90%] text-center border border-white/20 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
                            
                            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">¡Derrumbe!</h2>
                            <p className="text-white/60 font-medium mb-8 text-sm sm:text-base">Tu torre colapsó. La estructura no soportó la presión.</p>

                            <div className="bg-black/30 rounded-2xl p-6 mb-8 border border-white/5">
                                <span className="block text-xs text-white/50 font-black uppercase tracking-widest mb-2">Puntuación Final</span>
                                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{score}</span>
                            </div>

                            <button
                                onClick={restartGame}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg py-4 rounded-xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all outline-none border border-emerald-400/50"
                            >
                                Reconstruir
                            </button>
                            
                            {score > bestScore && (
                                <p className="text-amber-400 font-bold text-sm flex items-center justify-center mt-4 animate-pulse">
                                    ¡NUEVO RÉCORD MUNDIAL!
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D RENDER ENGINE */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 50 }}>
                {/* Entorno y Luces Atmosféricas */}
                <color attach="background" args={['transparent']} />

                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 20, 10]}
                    castShadow
                    intensity={1.5}
                    color="#fef08a"
                    shadow-mapSize={[1024, 1024]}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                    shadow-bias={-0.0001}
                />
                {/* Luz azulada desde abajo para contraste */}
                <pointLight position={[0, -5, 0]} intensity={2} color="#38bdf8" />
                <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#0f172a" />

                <Physics gravity={[0, -9.81, 0]}>
                    <BasePlatform />

                    {blocks.map((block) => (
                        <BuildingBlock
                            key={block.id}
                            id={block.id}
                            position={block.position}
                            color={block.color}
                            onFallOut={handleFallOut}
                        />
                    ))}

                    <CameraRig targetY={highestY} />
                </Physics>

                {!gameOver && (
                    <ConstructionDrone onDrop={handleDrop} isSpawning={isSpawning} targetY={highestY} difficultySpeed={difficultySpeed} />
                )}

                <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={20} blur={2.5} far={10} color="#000000" />
            </Canvas>
        </div>
    );
}

