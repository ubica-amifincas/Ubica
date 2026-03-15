import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Text, Float, ContactShadows, Circle } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {  
    PlayIcon, 
    ArrowPathIcon, 
    TrophyIcon, 
    ChevronLeftIcon,
    InformationCircleIcon,
    MoonIcon,
    SunIcon,
    EyeIcon,
    EyeSlashIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

// --- Types & Constants ---
interface BlockData {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
    isLogo: boolean;
}

interface FallingBlockData extends BlockData {
    vel: [number, number, number];
}

const COLORS = [
    '#3b82f6', // blue-500
    '#06b6d4', // cyan-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
    '#f43f5e', // rose-500
    '#f59e0b', // amber-500
];

// Componente para un segmento de la cuerda (Cilindro 3D)
function RopeSegment({ start, end }: { start: THREE.Vector3, end: THREE.Vector3 }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    // El cilindro base está en el eje Y, lo orientamos hacia la dirección del segmento
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.length() > 0.001 ? direction.clone().normalize() : up);

    return (
        <mesh 
            ref={meshRef} 
            position={midPoint} 
            quaternion={quaternion}
        >
            <cylinderGeometry args={[0.025, 0.025, length, 8]} />
            <meshStandardMaterial 
                color="#64748b" 
                metalness={0.5} 
                roughness={0.2} 
                emissive="#1e293b"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

// --- Components ---

// 1. Drone (Construction Drone)
function ConstructionDrone({ 
    position, 
    onDrop, 
    isHoldingBlock, 
    heldBlockColor,
    isLogoBlock,
    score,
    showPrediction
}: { 
    position: [number, number, number], 
    onDrop: (vel: [number, number, number], pos: [number, number, number]) => void,
    isHoldingBlock: boolean,
    heldBlockColor: string,
    isLogoBlock: boolean,
    score: number,
    showPrediction: boolean
}) {
    const groupRef = useRef<THREE.Group>(null);
    const blockRef = useRef<THREE.Group>(null);
    const shadowDotRef = useRef<THREE.Group>(null);
    const ropeLineRef = useRef<THREE.Line>(null);
    const { gl } = useThree();
    const rapier = useRapier();
    const { world, rapier: R } = rapier;
    
    // Altura del dron
    const droneY = position[1];
    
    // Puntos para la cuerda (simulación simple de péndulo/atraso)
    const [ropeSegments, setRopeSegments] = useState<THREE.Vector3[]>([]);
    const dronePrevPos = useRef(new THREE.Vector3(...position));
    const hookPos = useRef(new THREE.Vector3(position[0], position[1] - 4, position[2]));
    const hookVel = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        
        const t = state.clock.getElapsedTime();
        
        // Movimiento suave del dron (más lento al inicio)
        const speedMult = score < 10 ? 0.5 : Math.min(1.0, 0.5 + (score - 10) * 0.01);
        const targetX = position[0] + Math.sin(t * 0.8 * speedMult) * 4;
        const targetZ = position[2] + Math.cos(t * 0.5 * speedMult) * 2;
        
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.1);
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, droneY, 0.1);
        
        // Rotación de las hélices
        groupRef.current.children.forEach(child => {
            if (child.name === 'rotor') {
                child.rotation.y += 0.5;
            }
        });

        // Inclinación basada en movimiento
        const tiltX = (groupRef.current.position.z - dronePrevPos.current.z) * 2;
        const tiltZ = -(groupRef.current.position.x - dronePrevPos.current.x) * 2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tiltX, 0.1);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, tiltZ, 0.1);
        
        // Simulación de la cuerda y gancho
        const gravity = new THREE.Vector3(0, -9.8, 0);
        const dronePos = groupRef.current.position.clone();
        
        // El gancho intenta colgar debajo del dron
        const ropeLength = 4;
        const toHook = new THREE.Vector3().subVectors(hookPos.current, dronePos);
        
        // Física básica de péndulo
        hookVel.current.add(gravity.clone().multiplyScalar(delta));
        hookPos.current.add(hookVel.current.clone().multiplyScalar(delta));
        
        // Mantener distancia de la cuerda
        const currentDist = hookPos.current.distanceTo(dronePos);
        if (currentDist > ropeLength) {
            const correction = toHook.normalize().multiplyScalar(currentDist - ropeLength);
            hookPos.current.sub(correction);
            hookVel.current.sub(correction.multiplyScalar(0.5 / delta));
        }
        
        // Amortiguación
        hookVel.current.multiplyScalar(0.98);
        
        // Actualizar segmentos de la cuerda para visualización (Catenaria simple)
        const segments = 10;
        const newRopePoints: THREE.Vector3[] = [];
        const curve = new THREE.CatmullRomCurve3([
            dronePos,
            new THREE.Vector3().addVectors(dronePos, hookPos.current).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.2, 0)),
            hookPos.current
        ]);
        
        for(let i=0; i<=segments; i++) {
            newRopePoints.push(curve.getPoint(i/segments));
        }
        setRopeSegments(newRopePoints);

        if (ropeLineRef.current) {
            ropeLineRef.current.geometry.setFromPoints(newRopePoints);
        }
        
        if (blockRef.current) {
            blockRef.current.position.copy(hookPos.current);
            // El bloque rota según el movimiento (solo después de 50 pts)
            if (score >= 50) {
                blockRef.current.rotation.y = t * 1.5;
            }
        }

        // --- Raycast para la predicción de caída ---
        if (isHoldingBlock && showPrediction && shadowDotRef.current) {
            const rayStart = hookPos.current.clone();
            const rayDir = new THREE.Vector3(0, -1, 0);
            
            // Usar Rapier para el Raycast
            const ray = new R.Ray(rayStart, rayDir);
            const hit = world.castRay(ray, 50, true) as any;
            
            if (hit) {
                const hitPoint = rayStart.clone().add(rayDir.multiplyScalar(hit.toi));
                shadowDotRef.current.position.set(hitPoint.x, hitPoint.y + 0.05, hitPoint.z);
                
                // Alineación con la normal de la superficie (opcional, aquí plano)
                shadowDotRef.current.lookAt(hitPoint.x, hitPoint.y + 1, hitPoint.z);
                shadowDotRef.current.rotateX(-Math.PI / 2);
                
                shadowDotRef.current.visible = true;
                
                // Pulsar opacidad
                const pulse = 0.4 + Math.sin(t * 8) * 0.2;
                (shadowDotRef.current.children[0] as any).material.opacity = pulse;
                
                // Escalar según score (más pequeño conforme subes para más precisión)
                const baseScale = score < 100 ? 1 : 0.8;
                shadowDotRef.current.scale.setScalar(baseScale);
            } else {
                shadowDotRef.current.visible = false;
            }
        } else if (shadowDotRef.current) {
            shadowDotRef.current.visible = false;
        }
        
        dronePrevPos.current.copy(groupRef.current.position);
    });

    const handleDrop = () => {
        if (isHoldingBlock) {
            onDrop([hookVel.current.x, hookVel.current.y, hookVel.current.z], [hookPos.current.x, hookPos.current.y, hookPos.current.z]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') handleDrop();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHoldingBlock]);

    // Lógica de si es bloque logo (rojo vs normal)
    const isSpawning = isLogoBlock;

    return (
        <>
            {/* El Dron */}
            <group ref={groupRef} onClick={handleDrop}>
                {/* Cuerpo del Dron */}
                <mesh castShadow>
                    <boxGeometry args={[0.8, 0.2, 0.8]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                </mesh>
                
                {/* Motores y Hélices */}
                {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([x, z], i) => (
                    <group key={i} position={[x, 0.1, z]}>
                        <mesh castShadow>
                            <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
                            <meshStandardMaterial color="#334155" />
                        </mesh>
                        <mesh name="rotor" position={[0, 0.1, 0]}>
                            <boxGeometry args={[0.6, 0.02, 0.05]} />
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                    </group>
                ))}

                {/* Luces */}
                <pointLight position={[0, -0.2, 0]} intensity={2} color="#3b82f6" distance={3} />
            </group>

            {/* Visualización de la cuerda 3D */}
            {ropeSegments.length > 1 && ropeSegments.map((point, i) => (
                i < ropeSegments.length - 1 && (
                    <RopeSegment 
                        key={i} 
                        start={point} 
                        end={ropeSegments[i+1]} 
                    />
                )
            ))}

            {/* Línea invisible (mantenida por retrocompatibilidad/referencia) */}
            <line ref={ropeLineRef as any}>
                <bufferGeometry />
                <lineBasicMaterial color="#64748b" transparent opacity={0} />
            </line>

            {/* El bloque que sostiene el dron */}
            <group ref={blockRef} visible={isHoldingBlock}>
                {isLogoBlock ? (
                    <mesh castShadow>
                        <boxGeometry args={[1.2, 0.6, 0.4]} />
                        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.2} emissive="#ef4444" emissiveIntensity={0.5} />
                        <Text
                            position={[0, 0, 0.21]}
                            fontSize={0.2}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                        >
                            UBICA
                        </Text>
                    </mesh>
                ) : (
                    <mesh castShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color={heldBlockColor} metalness={0.2} roughness={0.8} />
                    </mesh>
                )}
            </group>

            {/* Shadow Dot de predicción Premium (Glow Effect) */}
            <group ref={shadowDotRef}>
                <Circle args={[0.5, 32]}>
                    <meshBasicMaterial 
                        color={isSpawning ? "#ef4444" : "#10b981"} 
                        transparent 
                        opacity={0.4} 
                        depthWrite={false} 
                        blending={THREE.AdditiveBlending}
                        polygonOffset
                        polygonOffsetFactor={-4}
                    />
                </Circle>
                <Circle args={[0.08, 16]} position={[0, 0, 0.01]}>
                    <meshBasicMaterial 
                        color="#ffffff" 
                        transparent 
                        opacity={0.8} 
                        depthWrite={false}
                        polygonOffset
                        polygonOffsetFactor={-5}
                    />
                </Circle>
            </group>
         </>
    );
}

// 3. Falling Blocks
function BuildingBlock({ position, rotation, color, initialVelocity, isLogo, onFallOut }: { position: [number, number, number], rotation?: [number, number, number], color: string, isLogo: boolean, initialVelocity: [number, number, number], id: string, onFallOut: () => void }) {
    const rigidBodyRef = useRef<any>(null);

    useFrame(() => {
        if (!rigidBodyRef.current) return;
        const currentPos = rigidBodyRef.current.translation();
        if (currentPos.y < -10 || Math.abs(currentPos.x) > 20 || Math.abs(currentPos.z) > 20) {
            onFallOut();
        }
    });

    return (
        <RigidBody 
            ref={rigidBodyRef}
            position={position} 
            rotation={rotation}
            linearVelocity={initialVelocity}
            colliders={false}
            mass={isLogo ? 2 : 1}
        >
            {isLogo ? (
                <>
                    <CuboidCollider args={[0.6, 0.3, 0.2]} />
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.6, 0.4]} />
                        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.2} emissive="#ef4444" emissiveIntensity={0.2} />
                        <Text
                            position={[0, 0, 0.21]}
                            fontSize={0.2}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                        >
                            UBICA
                        </Text>
                    </mesh>
                </>
            ) : (
                <>
                    <CuboidCollider args={[0.5, 0.5, 0.5]} />
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                </>
            )}
        </RigidBody>
    );
}

// 4. Stable Blocks (The tower)
function StableBlock({ position, rotation, color, isLogo }: BlockData) {
    return (
        <RigidBody type="dynamic" position={position} rotation={rotation} colliders={false} mass={isLogo ? 2 : 1}>
            {isLogo ? (
                <>
                    <CuboidCollider args={[0.6, 0.3, 0.2]} />
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.6, 0.4]} />
                        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.2} />
                        <Text
                            position={[0, 0, 0.21]}
                            fontSize={0.2}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                        >
                            UBICA
                        </Text>
                    </mesh>
                </>
            ) : (
                <>
                    <CuboidCollider args={[0.5, 0.5, 0.5]} />
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                </>
            )}
        </RigidBody>
    );
}

// --- Main Component ---
const UbicaBalance: React.FC = () => {
    // Game State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [stableBlocks, setStableBlocks] = useState<BlockData[]>([]);
    const [fallingBlocks, setFallingBlocks] = useState<FallingBlockData[]>([]);
    const [isHoldingBlock, setIsHoldingBlock] = useState(true);
    const [nextBlockColor, setNextBlockColor] = useState(COLORS[0]);
    const [isNextLogo, setIsNextLogo] = useState(false);
    const [highestY, setHighestY] = useState(0);
    const [darkMode, setDarkMode] = useState(true);
    const [showPrediction, setShowPrediction] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    
    // Physics constants
    const floorY = 0;
    
    // Almacenar el historial de alturas para evitar saltos de cámara
    const cameraTargetY = useRef(5);

    // Audio effects (placeholder logic)
    const playSound = (type: 'drop' | 'land' | 'fail' | 'celebrate') => {
        if (isMuted) return;
        // console.log(`Playing ${type} sound`);
    };

    const startGame = () => {
        setGameState('PLAYING');
        setScore(0);
        setStableBlocks([]);
        setFallingBlocks([]);
        setIsHoldingBlock(true);
        setHighestY(0);
        cameraTargetY.current = 5;
        setShowCelebration(false);
    };

    const handleDrop = (vel: [number, number, number], pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        
        const newFallingBlock: FallingBlockData = {
            id: Math.random().toString(36).substr(2, 9),
            position: pos,
            rotation: [0, 0, 0],
            color: nextBlockColor,
            isLogo: isNextLogo,
            vel: vel
        };
        
        setFallingBlocks(prev => [...prev, newFallingBlock]);
        setIsHoldingBlock(false);
        playSound('drop');
        
        // Preparar el siguiente bloque después de un retraso
        setTimeout(() => {
            setNextBlockColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
            // 15% de probabilidad de ser un bloque LOGO
            setIsNextLogo(Math.random() < 0.15);
            setIsHoldingBlock(true);
        }, 1000);
    };

    const handleBlockFallOut = (id: string, wasStable: boolean = false) => {
        if (wasStable) {
            setGameState('GAMEOVER');
            playSound('fail');
        } else {
            setFallingBlocks(prev => prev.filter(b => b.id !== id));
        }
    };

    // Sensor de bloques estables (usamos Rapier para detectar colisiones con el suelo o entre bloques)
    // En este prototipo simplificamos: si un bloque cae y su velocidad es casi 0 y está por encima de highestY, es el nuevo tope.
    // Usamos un intervalo para chequear bloques en reposo
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        
        const interval = setInterval(() => {
            // Lógica para estabilizar bloques (realmente esto se manejaría mejor con eventos de colisión de Rapier)
            // Por ahora, para el demo, convertimos falling a stable si están cerca de otros bloques
        }, 500);
        
        return () => clearInterval(interval);
    }, [gameState]);

    // Lógica para detectar el fin del juego (si el bloque base se cae)
    // En una implementación real, usaríamos sensores de colisión.

    // Actualizar score y altura
    const addPoint = (isLogo: boolean) => {
        const points = isLogo ? 5 : 1;
        setScore(prev => {
            const newScore = prev + points;
            if (newScore >= 100 && prev < 100) {
                setShowCelebration(true);
                playSound('celebrate');
            }
            return newScore;
        });
        
        setStableBlocks(prev => {
            const newArray = [...prev, {
                id: Math.random().toString(),
                position: [0, highestY + 1, 0],
                rotation: [0, 0, 0],
                color: nextBlockColor,
                isLogo: isNextLogo
            } as BlockData];
            
            // Suavizar la progresión de altura
            setHighestY(newArray.length * 0.6);
            return newArray;
        });
    };

    return (
        <div className={`relative w-full h-[calc(100vh-64px)] overflow-hidden font-sans transition-colors duration-500 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
            
            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start pointer-events-auto">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                UBICA <span className="text-blue-500">BALANCE</span>
                            </h1>
                            <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-mono">
                                V2.0 PRO
                            </div>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Construye la torre más alta sin que caiga</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowPrediction(!showPrediction)}
                            className={`p-2 rounded-xl border transition-all ${
                                darkMode 
                                ? 'bg-slate-900/50 border-white/10 text-white hover:bg-slate-800' 
                                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                            }`}
                            title="Alternar Guía de Caída"
                        >
                            {showPrediction ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                        </button>
                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className={`p-2 rounded-xl border transition-all ${
                                darkMode 
                                ? 'bg-slate-900/50 border-white/10 text-white hover:bg-slate-800' 
                                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Score Center */}
                <div className="flex flex-col items-center">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={score}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <span className={`text-7xl font-black tabular-nums transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {score}
                            </span>
                            <span className="text-blue-500 text-sm font-bold tracking-widest uppercase">PUNTOS</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom Controls */}
                <div className="flex justify-between items-end">
                    <div className={`p-4 rounded-2xl border backdrop-blur-md pointer-events-auto ${
                        darkMode 
                        ? 'bg-slate-900/30 border-white/5' 
                        : 'bg-white/50 border-slate-200'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Siguiente Bloque</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div 
                                        className={`w-10 h-6 rounded border ${isNextLogo ? 'animate-pulse' : ''}`}
                                        style={{ backgroundColor: isNextLogo ? '#ef4444' : nextBlockColor, borderColor: 'rgba(0,0,0,0.1)' }}
                                    >
                                        {isNextLogo && <div className="w-full h-full flex items-center justify-center text-[6px] text-white font-bold">LOGO</div>}
                                    </div>
                                    <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {isNextLogo ? 'Ubica Logo (Special)' : 'Bloque Estándar'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-slate-500/20 mx-2" />
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Récord Personal</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <TrophyIcon className="w-4 h-4 text-amber-500" />
                                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{highScore}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 pointer-events-auto">
                        <div className={`px-4 py-2 rounded-full border text-xs font-bold transition-all flex items-center gap-2 ${
                            darkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                            <InformationCircleIcon className="w-4 h-4" />
                            Presiona <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white uppercase text-[10px]">Espacio</span> para soltar
                        </div>
                    </div>
                </div>
            </div>

            {/* Game States Screens */}
            <AnimatePresence>
                {gameState === 'START' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ y: 20, scale: 0.9 }}
                            animate={{ y: 0, scale: 1 }}
                            className="bg-slate-900 border border-white/10 p-10 rounded-[32px] shadow-2xl max-w-md w-full text-center flex flex-col items-center"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                <SparklesIcon className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">UBICA BALANCE</h2>
                            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                                Pon a prueba tu precisión. Apila bloques y construye el rascacielos definitivo usando el dron de construcción.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                                    <div className="text-blue-500 font-bold mb-1">Dron</div>
                                    <div className="text-xs text-slate-500">Usa la inercia</div>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                                    <div className="text-rose-500 font-bold mb-1">Logo</div>
                                    <div className="text-xs text-slate-500">X5 Puntos</div>
                                </div>
                            </div>

                            <button 
                                onClick={startGame}
                                className="group relative w-full py-4 bg-white text-slate-950 font-black rounded-2xl overflow-hidden active:scale-95 transition-all shadow-xl shadow-white/10"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    COMENZAR JUEGO <PlayIcon className="w-5 h-5 fill-current" />
                                </span>
                                <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {gameState === 'GAMEOVER' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-rose-950/40 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, rotate: -2 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-slate-950 border border-rose-500/30 p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-6 mx-auto">
                                <ArrowPathIcon className="w-8 h-8 text-rose-500" />
                            </div>
                            <h2 className="text-4xl font-black text-white mb-1">¡UPS!</h2>
                            <p className="text-rose-300/60 font-medium mb-8 uppercase tracking-widest text-xs">La torre colapsó</p>
                            
                            <div className="bg-slate-900 rounded-2xl p-6 mb-8 border border-white/5">
                                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Puntuación Final</div>
                                <div className="text-5xl font-black text-white mb-4 tabular-nums">{score}</div>
                                <div className="flex justify-between items-center text-xs pt-4 border-t border-white/5">
                                    <span className="text-slate-500 font-bold uppercase">Record Actual</span>
                                    <span className="text-amber-500 font-black">{highScore}</span>
                                </div>
                            </div>

                            <button 
                                onClick={startGame}
                                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-3"
                            >
                                REINTENTAR <ArrowPathIcon className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
                
                {showCelebration && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    >
                        <div className="relative">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full scale-[2]"
                            />
                            <div className="bg-white/10 backdrop-blur-xl p-12 rounded-[50px] border border-white/20 shadow-2xl flex flex-col items-center">
                                <SparklesIcon className="w-16 h-16 text-blue-400 mb-4 animate-bounce" />
                                <h3 className="text-white text-5xl font-black tracking-tighter text-center">¡100 PUNTOS!</h3>
                                <div className="mt-6 flex gap-2">
                                    <div className="w-12 h-6 bg-blue-500 rounded-full" />
                                    <div className="w-12 h-6 bg-amber-500 rounded-full" />
                                    <div className="w-12 h-6 bg-rose-500 rounded-full" />
                                </div>
                                <p className="text-white font-bold mt-6 tracking-widest text-xs uppercase opacity-70">Desbloqueaste el modo Pro</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Canvas */}
            <Canvas shadows gl={{ antialias: true, logarithmicDepthBuffer: true }}>
                <PerspectiveCamera 
                    makeDefault 
                    position={[15, highestY + 8, 15]} 
                    fov={45} 
                />
                <OrbitControls 
                    target={[0, highestY, 0]} 
                    enabled={gameState !== 'PLAYING'} 
                    minDistance={10}
                    maxDistance={50}
                />
                
                {/* Environment */}
                <Suspense fallback={null}>
                    <Environment preset={darkMode ? "night" : "city"} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                </Suspense>

                {/* Lights */}
                <ambientLight intensity={darkMode ? 0.2 : 0.5} />
                <directionalLight 
                    position={[10, 20, 10]} 
                    intensity={darkMode ? 0.8 : 1.2} 
                    castShadow 
                    shadow-mapSize={[2048, 2048]}
                >
                    <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
                </directionalLight>
                <spotLight position={[0, 15, 0]} intensity={darkMode ? 1 : 2} color="#3b82f6" angle={0.6} penumbra={1} castShadow />

                {/* Physics World */}
                <Physics gravity={[0, -9.8, 0]}>
                    {/* The Floor / Platform */}
                    <RigidBody type="fixed" position={[0, floorY, 0]} colliders="cuboid">
                        <mesh receiveShadow>
                            <cylinderGeometry args={[4, 4, 1, 32]} />
                            <meshStandardMaterial 
                                color={darkMode ? "#0f172a" : "#f1f5f9"} 
                                metalness={0.8} 
                                roughness={0.2} 
                            />
                        </mesh>
                        {/* Pedestal Top */}
                        <mesh position={[0, 0.51, 0]} receiveShadow>
                            <cylinderGeometry args={[3.8, 3.8, 0.05, 32]} />
                            <meshStandardMaterial color={darkMode ? "#1e293b" : "#e2e8f0"} />
                        </mesh>
                    </RigidBody>

                    {/* Helipad marking */}
                    <mesh position={[0, floorY + 0.57, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[3.2, 3.3, 32]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
                    </mesh>

                    {/* Stable Blocks */}
                    {stableBlocks.map(block => (
                        <StableBlock key={block.id} {...block} />
                    ))}

                    {/* Falling Blocks */}
                    {fallingBlocks.map((block: FallingBlockData) => (
                        <BuildingBlock 
                            key={block.id} 
                            id={block.id}
                            position={block.position}
                            rotation={block.rotation}
                            color={block.color}
                            isLogo={block.isLogo}
                            initialVelocity={block.vel}
                            onFallOut={() => handleBlockFallOut(block.id)}
                        />
                    ))}

                    {/* Static decorative grids */}
                    {darkMode && (
                        <gridHelper args={[100, 50, "#1e293b", "#0f172a"]} position={[0, -0.1, 0]} />
                    )}

                    {/* Drone y Garra (Solo si estamos jugando) */}
                    {gameState === 'PLAYING' && (
                        <ConstructionDrone 
                            position={[0, highestY + 8, 0]} 
                            onDrop={handleDrop}
                            isHoldingBlock={isHoldingBlock}
                            heldBlockColor={nextBlockColor}
                            isLogoBlock={isNextLogo}
                            score={score}
                            showPrediction={showPrediction}
                        />
                    )}
                </Physics>

                {/* Global Shadows */}
                <ContactShadows 
                    position={[0, floorY + 0.5, 0]} 
                    opacity={0.4} 
                    scale={20} 
                    blur={2} 
                    far={4.5} 
                />
            </Canvas>

            {/* Hint for mobile */}
            <div className="lg:hidden absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Toca el dron para soltar</span>
            </div>
        </div>
    );
};

export default UbicaBalance;
