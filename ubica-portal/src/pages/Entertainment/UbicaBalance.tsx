import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, useRapier } from '@react-three/rapier';
import { Environment, ContactShadows, Edges, Circle, OrbitControls, Sky, Trail } from '@react-three/drei';
import { EffectComposer, SSAO, DepthOfField, Bloom } from '@react-three/postprocessing';
import { ChevronLeftIcon, LockClosedIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// --- GAME LOGIC STATE ---
interface BlockData {
    id: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    color: string;
    type: 'base' | 'building';
    blockType: 'normal' | 'ice' | 'metal' | 'bouncy';
    initialVelocity?: [number, number, number];
    isLogo?: boolean;
}

const BLOCK_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#6366f1', // indigo-500
    '#0ea5e9', // sky-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
];

const getNextRandomColor = () => {
    if (Math.random() < 0.1) return 'LOGO';
    const colors = BLOCK_COLORS || [];
    if (colors.length === 0) return '#3b82f6';
    return colors[Math.floor(Math.random() * colors.length)];
};

const getNextBlockType = (): 'normal' | 'ice' | 'metal' | 'bouncy' => {
    const rand = Math.random();
    if (rand < 0.10) return 'metal';    // 10%
    if (rand < 0.20) return 'ice';      // 10%
    if (rand < 0.25) return 'bouncy';   // 5%
    return 'normal';                    // 75%
};

// --- GLOBAL STATE FOR GAME FEEL ---
class GameFeelStore {
    static screenShake = 0;
    static impactParticles: { id: string, pos: THREE.Vector3, color: string }[] = [];
    static listeners = new Set<() => void>();
    
    static triggerShake(intensity: number) {
        this.screenShake = intensity;
    }
    
    static spawnParticles(pos: THREE.Vector3, color: string) {
        this.impactParticles.push({ id: Math.random().toString(), pos: pos.clone(), color });
        if (this.impactParticles.length > 10) this.impactParticles.shift(); // Keep max 10
        this.emit();
    }
    
    static removeParticle(id: string) {
        this.impactParticles = this.impactParticles.filter(p => p.id !== id);
        this.emit();
    }
    
    static emit() {
        this.listeners.forEach(l => l());
    }
}


// Componente para un segmento de la cuerda (Cilindro 3D delgado)
function RopeSegment({ start, end }: { start: THREE.Vector3, end: THREE.Vector3 }) {
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    // Low-poly thin cable
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.length() > 0.001 ? direction.clone().normalize() : up);

    return (
        <mesh position={midPoint} quaternion={quaternion}>
            <cylinderGeometry args={[0.02, 0.02, length, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.3} />
        </mesh>
    );
}

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
function ConstructionDrone({ onDrop, isSpawning, targetY, nextColor, currentScore }: { 
    onDrop: (x: number, z: number, y: number, vx: number, vz: number, isLogo: boolean, rx?: number, ry?: number, rz?: number) => void, 
    isSpawning: boolean, 
    targetY: number, 
    nextColor: string,
    currentScore: number 
}) {
    const groupRef = useRef<THREE.Group>(null);
    const shadowDotRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const ropeSegmentsRef = useRef<THREE.Group>(null);
    const { rapier, world } = useRapier();
    
    // Rope Physics State
    const dronePrevPos = useRef<THREE.Vector3 | null>(null);
    const droneVel = useRef(new THREE.Vector3());
    const ropeSegments = 8;
    const ropeLength = 2.5;
    const hookPos = useRef(new THREE.Vector3(0, -ropeLength, 0));
    const hookVel = useRef(new THREE.Vector3(0, 0, 0));
    const ropeLineRef = useRef<THREE.Line>(null);
    const hookVisualRef = useRef<THREE.Group>(null);
    const heldBlockRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (!groupRef.current || !rapier || !world) return;

        const t = state.clock.getElapsedTime();
        
        // --- GAMEPLAY BALANCE ---
        // 1. Velocity: Very slow first 10 points, then ramp up GRADUALLY
        let effectiveSpeed = 0.7; // Base slower speed for beginners
        if (currentScore >= 10) {
            // Smooth linear ramp: 0.7 + 0.01 per point above 10
            // At 100 points, effectiveSpeed will be 1.6
            effectiveSpeed = 0.7 + Math.min(1.0, (currentScore - 10) * 0.01);
        }
        
        // --- WIND LOGIC ---
        // Generates a wandering vector representing wind
        const windIntensity = (currentScore > 10 ? Math.min(1, (currentScore - 10) / 40) : 0) * 0.5;
        const windX = Math.sin(t * 0.5) * Math.cos(t * 0.3) * windIntensity;
        const windZ = Math.cos(t * 0.4) * Math.sin(t * 0.6) * windIntensity;
        const windForce = new THREE.Vector3(windX, 0, windZ);

        const x = Math.sin(t * effectiveSpeed) * 3.5 + windForce.x * 5;
        const z = Math.cos(t * effectiveSpeed * 0.8) * 1.5 + windForce.z * 5;

        // 2. Drone realistic tilt - Also scale with speed
        const tiltIntensity = currentScore < 10 ? 0.05 : 0.15;
        const tiltX = Math.cos(t * effectiveSpeed) * tiltIntensity;
        const tiltZ = Math.sin(t * effectiveSpeed * 0.8) * -tiltIntensity;

        const dronePos = new THREE.Vector3(x, targetY + 6, z);
        
        // --- POSITION TRACKING FIX ---
        // Initialize on first frame to avoid infinite acceleration bug
        if (!dronePrevPos.current) {
            dronePrevPos.current = dronePos.clone();
            return;
        }

        // Calculate velocity & acceleration
        const currentVel = dronePos.clone().sub(dronePrevPos.current).divideScalar(delta || 0.016);
        const droneAccel = currentVel.clone().sub(droneVel.current).divideScalar(delta || 0.016);
        droneVel.current.copy(currentVel);
        dronePrevPos.current.copy(dronePos);

        groupRef.current.position.copy(dronePos);
        
        // 3. Rotation Balance: No rotation until 50 points
        const rotationSpeed = currentScore >= 50 ? 1.5 : 0;
        groupRef.current.rotation.set(tiltZ, t * rotationSpeed, tiltX);
        
        // --- ROPE & HOOK PHYSICS (Local Space) ---
        const invQuat = groupRef.current.quaternion.clone().invert();
        
        // 1. Gravity in local space
        const localGravity = new THREE.Vector3(0, -9.81, 0).applyQuaternion(invQuat);
        
        // 2. Inertial force (Drone acceleration "pushes" objects in opposite direction)
        const inertialForce = droneAccel.clone().applyQuaternion(invQuat).multiplyScalar(-0.8);

        // 3. Hook Pendulum Simulation
        const hookToDrone = new THREE.Vector3(0, 0, 0).sub(hookPos.current);
        const distance = hookToDrone.length();
        
        // Spring-like constraint to keep hook at ropeLength
        const stretch = distance - ropeLength;
        const springForce = hookToDrone.normalize().multiplyScalar(stretch * 300); // Higher K for stiffness
        
        // Apply forces including wind
        const localWind = windForce.clone().applyQuaternion(invQuat).multiplyScalar(15);
        const damping = 0.96;
        hookVel.current.add(localGravity.multiplyScalar(delta));
        hookVel.current.add(inertialForce.multiplyScalar(delta));
        hookVel.current.add(springForce.multiplyScalar(delta));
        hookVel.current.add(localWind.multiplyScalar(delta));

        hookVel.current.multiplyScalar(damping);
        hookPos.current.add(hookVel.current.clone().multiplyScalar(delta));

        // 4. Recoil on Drop (Impulse)
        if (isSpawning) {
            hookVel.current.y += 8 * delta; 
        }

        // 5. Update Rope Segments (Visuals)
        // We create a CatmullRomCurve3 but for the rope visualization 
        // we'll just use 3 points for a nice sag: Start, Mid (with sag), End
        const midPoint = hookPos.current.clone().multiplyScalar(0.5);
        // Add a bit of "inertia sag" to the midpoint
        midPoint.add(hookVel.current.clone().multiplyScalar(-0.05));

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            midPoint,
            hookPos.current
        ]);
        const points = curve.getPoints(ropeSegments);

        // Update rope segments directly via refs (performance)
        if (ropeSegmentsRef.current) {
            const meshes = ropeSegmentsRef.current.children as THREE.Mesh[];
            for (let i = 0; i < ropeSegments; i++) {
                const mesh = meshes[i];
                    if (mesh) {
                        const p1 = points[i];
                        const p2 = points[i+1];
                        if (!p1 || !p2) continue;
                        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                        const dir = new THREE.Vector3().subVectors(p2, p1);
                        const len = dir.length();
                        
                        mesh.position.copy(mid);
                        const up = new THREE.Vector3(0, 1, 0);
                        mesh.quaternion.setFromUnitVectors(up, len > 0.001 ? dir.clone().normalize() : up);
                        mesh.scale.set(1, len, 1);
                    }
            }
        }

        if (ropeLineRef.current) {
            ropeLineRef.current.geometry.setFromPoints(points);
        }

        // 6. Update Hook Visuals
        if (hookVisualRef.current) {
            hookVisualRef.current.position.copy(hookPos.current);
            // Rotate hook to face the direction of the rope (local up is the vector to drone)
            const up = new THREE.Vector3(0, 0, 0).sub(hookPos.current).normalize();
            // We want the hook's Y axis to align with 'up'
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
            hookVisualRef.current.quaternion.copy(quat);
        }

        if (ringRef.current) {
             const mat = ringRef.current.material as THREE.MeshStandardMaterial;
             if (mat) mat.emissiveIntensity = isSpawning ? 3 : 1 + Math.sin(t * 5) * 0.5;
        }

        // 7. Shadow prediction dot
        if (shadowDotRef.current) {
             const worldHookPos = hookPos.current.clone().applyMatrix4(groupRef.current.matrixWorld);
             const ray = new rapier.Ray(worldHookPos, { x: 0, y: -1, z: 0 });
             const hit = world.castRay(ray, 50, true);
             
             if (hit && (hit as any).toi) {
                 const hitPoint = ray.pointAt((hit as any).toi);
                 shadowDotRef.current.position.set(hitPoint.x, hitPoint.y + 0.05, hitPoint.z);
             } else {
                 shadowDotRef.current.position.set(worldHookPos.x, Math.max(0, targetY - 10), worldHookPos.z);
             }
             
             const material = shadowDotRef.current.material as THREE.MeshBasicMaterial;
             material.opacity = isSpawning ? 0.8 : 0.4 + Math.sin(t * 8) * 0.2;
             const dotRamp = currentScore < 10 ? 0 : Math.min(1, (currentScore - 10) * 0.015);
             const scale = Math.max(0.5, 1.2 - (dotRamp * 0.7));
             shadowDotRef.current.scale.set(scale, scale, 1);
        }
    });

    useEffect(() => {
        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'button' || (e.target as HTMLElement).closest('button')) return;
            if ((e.target as HTMLElement).tagName.toLowerCase() === 'a' || (e.target as HTMLElement).closest('a')) return;

            if (!isSpawning && groupRef.current && heldBlockRef.current) {
                const worldPos = new THREE.Vector3();
                heldBlockRef.current.getWorldPosition(worldPos);

                const worldQuat = new THREE.Quaternion();
                heldBlockRef.current.getWorldQuaternion(worldQuat);
                const euler = new THREE.Euler().setFromQuaternion(worldQuat);

                // Add hook velocity to drop velocity
                const worldHookVel = hookVel.current.clone().applyQuaternion(groupRef.current.quaternion);

                onDrop(
                    worldPos.x, 
                    worldPos.z, 
                    worldPos.y,
                    worldHookVel.x * 2, // Combined velocity
                    worldHookVel.z * 2, 
                    nextColor === 'LOGO',
                    euler.x,
                    euler.y,
                    euler.z
                );
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', (e) => { if(e.code === 'Space') handlePointerDown(e as any) });
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', (e) => { if(e.code === 'Space') handlePointerDown(e as any) });
        };
    }, [onDrop, isSpawning, nextColor]);

    return (
        <>
            <group ref={groupRef}>
            {/* Main Body Core */}
            <mesh castShadow position={[0, 0, 0]}>
                <boxGeometry args={[1.2, 0.4, 1.2]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                <Edges scale={1} threshold={15} color="#0f172a" />
            </mesh>

            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
            </mesh>
            
            <mesh ref={ringRef} position={[0, -0.21, 0]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.3, 0.05, 16, 32]} />
                <meshStandardMaterial color={isSpawning ? "#ef4444" : "#10b981"} emissive={isSpawning ? "#ef4444" : "#10b981"} emissiveIntensity={3} toneMapped={false} />
            </mesh>

            {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z], i) => (
                <group key={i} position={[x * 0.8, 0, z * 0.8]}>
                    <mesh castShadow position={[-x * 0.15, 0, -z * 0.15]} rotation={[0, Math.atan2(x, z), 0]}>
                        <boxGeometry args={[0.1, 0.1, 0.6]} />
                        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
                    </mesh>
                    <mesh castShadow position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0.25, 0]}>
                        <cylinderGeometry args={[0.4, 0.4, 0.02, 16]} />
                        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} metalness={0.5} roughness={0.2} />
                    </mesh>
                </group>
            ))}

            {/* NEW Optimized 3D Rope segments */}
            <group ref={ropeSegmentsRef}>
                {Array.from({ length: ropeSegments }).map((_, i) => (
                    <mesh key={i}>
                        <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
                        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.3} />
                    </mesh>
                ))}
            </group>

            {/* Hidden line removed to fix SVG/Three confustion - using ropeSegmentsRef instead */}
            
            {/* Hook & Held Block Assembly */}
            <group ref={hookVisualRef}>
                {/* Claw Base */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.6, 0.1, 0.6]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                </mesh>
                
                {/* Claw Arms */}
                <mesh position={[0.3, -0.1, 0]} rotation={[0, 0, isSpawning ? -Math.PI/3 : -Math.PI/8]}>
                    <boxGeometry args={[0.05, 0.4, 0.4]} />
                    <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
                </mesh>
                <mesh position={[-0.3, -0.1, 0]} rotation={[0, 0, isSpawning ? Math.PI/3 : Math.PI/8]}>
                    <boxGeometry args={[0.05, 0.4, 0.4]} />
                    <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
                </mesh>

                {/* Held Block Visually */}
                {!isSpawning && (
                     <group position={[0, -0.6, 0]} ref={heldBlockRef}>
                         {nextColor !== 'LOGO' ? (
                             <mesh castShadow receiveShadow>
                                <boxGeometry args={[1.5, 1, 1.5]} />
                                <meshStandardMaterial color={nextColor} roughness={0.7} metalness={0.2} />
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
                         ) : (
                             <mesh castShadow receiveShadow>
                                <boxGeometry args={[1.6, 1.2, 1.6]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.6} />
                                <Edges scale={1} threshold={15} color="#10b981" />
                                <mesh position={[0, 0, 0.801]}>
                                    <boxGeometry args={[0.5, 0.5, 0.05]} />
                                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
                                </mesh>
                             </mesh>
                         )}
                     </group>
                )}
            </group>
         </group>
         
         {/* Prediction Shadow Dot (Floor Level) */}
          <mesh ref={shadowDotRef} position={[0, targetY, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshBasicMaterial 
                color={isSpawning ? "#ef4444" : "#10b981"} 
                transparent 
                opacity={0.5} 
                depthWrite={false} 
                blending={THREE.AdditiveBlending}
                polygonOffset
                polygonOffsetFactor={-1}
              />
              <mesh position={[0, 0, 0.01]}>
                  <circleGeometry args={[0.1, 16]} />
                  <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.8} 
                    depthWrite={false}
                    polygonOffset
                    polygonOffsetFactor={-2}
                  />
              </mesh>
          </mesh>
         </>
    );
}
         
// --- PARTICLE SYSTEM ---
function ImpactParticles() {
    const [particles, setParticles] = useState<{ id: string, pos: THREE.Vector3, color: string, timestamp: number }[]>([]);

    useEffect(() => {
        const updateParticles = () => {
            const now = Date.now();
            setParticles(GameFeelStore.impactParticles.map(p => ({ ...p, timestamp: now })));
        };
        GameFeelStore.listeners.add(updateParticles);
        return () => { GameFeelStore.listeners.delete(updateParticles); };
    }, []);

    useFrame(() => {
        // Particles self-destruct visually or mathematically handled here
        // For simplicity we just map them to quick expanding rings
    });

    return (
        <>
            {particles.map(p => (
                <mesh key={p.id} position={p.pos}>
                    <ringGeometry args={[0.1, 0.3, 16]} />
                    <meshBasicMaterial color={p.color} transparent opacity={0.6} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </>
    );
}

// 3. Falling Blocks
function BuildingBlock({ position, rotation, color, initialVelocity, isLogo, blockType, id, onFallOut }: { position: [number, number, number], rotation?: [number, number, number], color: string, isLogo: boolean, blockType: 'normal' | 'ice' | 'metal' | 'bouncy', initialVelocity: [number, number, number], id: string, onFallOut: () => void }) {
    const rigidBodyRef = useRef<any>(null);

    const physicsProps = useMemo(() => {
        if (isLogo) return { mass: 3.0, friction: 0.9, restitution: 0.3 };
        switch(blockType) {
            case 'ice': return { mass: 1.2, friction: 0.05, restitution: 0.1 };
            case 'metal': return { mass: 4.0, friction: 0.8, restitution: 0.02 };
            case 'bouncy': return { mass: 1.0, friction: 0.6, restitution: 1.2 };
            default: return { mass: 1.5, friction: 0.8, restitution: 0.05 };
        }
    }, [blockType, isLogo]);

    useFrame(() => {
        if (!rigidBodyRef.current) return;
        const currentPos = rigidBodyRef.current.translation();
        if (currentPos.y < -5) {
            onFallOut();
        }
    });

    const handleCollision = (e: any) => {
        // Simple impact estimation based on impulse or relative velocity
        const impactStr = e.totalForceMagnitude || 5; 
        if (impactStr > 2) {
            GameFeelStore.triggerShake(Math.min(0.2, impactStr * 0.01 * physicsProps.mass));
            
            // Only spawn particles if it's hitting something hard
            if (Math.random() > 0.3) {
                // Get contact point
                const contact = new THREE.Vector3(position[0], position[1] - 0.5, position[2]);
                GameFeelStore.spawnParticles(contact, color);
            }
        }
    };

    return (
        <RigidBody
            ref={rigidBodyRef}
            type="dynamic"
            position={position}
            rotation={rotation || [0, 0, 0]}
            mass={physicsProps.mass}
            friction={physicsProps.friction}
            restitution={physicsProps.restitution}
            linearDamping={0.5}
            angularDamping={0.5}
            linearVelocity={initialVelocity}
            canSleep={false}
            onCollisionEnter={handleCollision}
        >
            {isLogo ? (
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1.6, 1.2, 1.6]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.6} />
                    <Edges scale={1} threshold={15} color="#10b981" />
                    <mesh position={[0, 0, 0.801]}>
                        <boxGeometry args={[0.5, 0.5, 0.05]} />
                        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
                    </mesh>
                 </mesh>
            ) : (
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1.5, 1, 1.5]} />
                    {blockType === 'ice' ? (
                        <meshPhysicalMaterial color={color} roughness={0.1} transmission={0.9} thickness={0.5} metalness={0.1} reflectivity={1} />
                    ) : blockType === 'metal' ? (
                        <meshStandardMaterial color={color} roughness={0.2} metalness={0.9} envMapIntensity={1} />
                    ) : blockType === 'bouncy' ? (
                        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={1} clearcoatRoughness={0.1} metalness={0.1} />
                    ) : (
                        <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
                    )}
                    <Edges scale={1} threshold={15} color="#0f172a" />

                    {blockType !== 'ice' && blockType !== 'metal' && (
                        <>
                            <mesh position={[0, 0, 0.751]}>
                                <planeGeometry args={[1.2, 0.6]} />
                                <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
                            </mesh>
                            <mesh position={[0, 0, -0.751]} rotation={[0, Math.PI, 0]}>
                                <planeGeometry args={[1.2, 0.6]} />
                                <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
                            </mesh>
                        </>
                    )}
                </mesh>
            )}
        </RigidBody>
    );
}

// 4. Dynamic Camera
function CameraRig({ targetY }: { targetY: number }) {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    useFrame((state, delta) => {
        // Drop Screen Shake
        if (GameFeelStore.screenShake > 0) {
            camera.position.x += (Math.random() - 0.5) * GameFeelStore.screenShake;
            camera.position.y += (Math.random() - 0.5) * GameFeelStore.screenShake;
            camera.position.z += (Math.random() - 0.5) * GameFeelStore.screenShake;
            GameFeelStore.screenShake *= 0.9;
            if (GameFeelStore.screenShake < 0.01) GameFeelStore.screenShake = 0;
        }

        if (controlsRef.current) {
            // Smoothly move the camera's focus target up as the tower grows
            const targetPos = new THREE.Vector3(0, targetY * 0.7, 0);
            controlsRef.current.target.lerp(targetPos, 0.05);
            controlsRef.current.update();
        }
    });

    return <OrbitControls ref={controlsRef} enablePan={false} enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2 - 0.1} minPolarAngle={0.1} maxDistance={30} minDistance={10} />;
}

// --- MAIN UX COMPONENT ---
export default function UbicaBalance() {
    const { user } = useAuth();
    const appService = useAuthenticatedFetch(); // To make API calls for Leaderboard

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
    const [scoreAnimation, setScoreAnimation] = useState(false);
    const [nextColor, setNextColor] = useState(getNextRandomColor);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    
    // Phase 3 states
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0, z: 0 });
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
    const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
    const [hasCelebrated100, setHasCelebrated100] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        try {
            // Re-using the known appService api pattern or default fetch
            const token = localStorage.getItem('access_token');
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app') ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api');
            
            const res = await fetch(`${apiUrl}/games/balance/leaderboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
            setLeaderboard([]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        if (user) {
            fetchLeaderboard();
        }
    }, [user, fetchLeaderboard]);

    // Save score when game over
    useEffect(() => {
        if (gameOver && score > 0 && user) {
            const saveScore = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app') ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api');
                    
                    const res = await fetch(`${apiUrl}/games/score`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({ game_name: 'balance', score: score })
                    });
                    
                    if (res.ok) {
                        fetchLeaderboard();
                    }
                } catch (e) {
                    console.error("Error saving score", e);
                }
            };
            saveScore();
        }
    }, [gameOver, score, user, fetchLeaderboard]);

    const handleFallOut = useCallback(() => {
        if (!gameOver) {
            setGameOver(true);
        }
    }, [gameOver]);

    const handleDrop = useCallback((x: number, z: number, y: number, vx: number, vz: number, isLogo: boolean, rx: number = 0, ry: number = 0, rz: number = 0) => {
        if (gameOver || isSpawning) return;

        setIsSpawning(true);

        // Combo Logic based on drop precision to origin (0,0)
        // If it's a LOGO block, extra points!
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
        
        if (isLogo) {
             pts *= 2;
             txt = txt ? `UBICA! +${pts}` : `UBICA! +${pts}`;
        }

        if (txt) {
            setComboText(txt);
            setTimeout(() => setComboText(""), 1200);
        }

        const newBlock: BlockData = {
            id: `block-${Date.now()}`,
            position: [x, y, z],
            rotation: [rx, ry, rz],
            initialVelocity: [vx, 0, vz],
            color: nextColor,
            isLogo: isLogo,
            type: 'building',
            blockType: getNextBlockType()
        };

        setBlocks(prev => {
            const newArray = [...prev, newBlock];
            
            setScore(prevScore => {
                const newScore = prevScore + pts;
                // Check for 100 point milestone
                if (newScore >= 100 && !hasCelebrated100) {
                    setShowMilestoneCelebration(true);
                    setHasCelebrated100(true);
                    setTimeout(() => setShowMilestoneCelebration(false), 5000);
                }
                return newScore;
            });
            setScoreAnimation(true);
            setTimeout(() => setScoreAnimation(false), 200);

            setHighestY(newArray.length * 0.6); // Adjusted for smoother height progression
            
            return newArray;
        });

        setTimeout(() => {
            setIsSpawning(false);
            setNextColor(getNextRandomColor());
        }, 800);
    }, [gameOver, isSpawning, comboMultiplier, nextColor]);

    const restartGame = () => {
        setBlocks([]);
        setHighestY(0);
        setScore(0);
        setGameOver(false);
        setIsSpawning(false);
        setComboMultiplier(1);
        setComboText("");
        setNextColor(getNextRandomColor());
        setHasCelebrated100(false);
        setShowMilestoneCelebration(false);
        fetchLeaderboard(); // refresh stats
    };

    const adjustCamera = (axis: 'x' | 'y' | 'z', amount: number) => {
        setCameraOffset(prev => ({ ...prev, [axis]: prev[axis] + amount }));
    };

    const resetCamera = () => {
        setCameraOffset({ x: 0, y: 0, z: 0 });
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
        <div className={`w-full h-screen relative transition-colors duration-700 overflow-hidden font-sans select-none touch-none ${
            isDarkMode ? 'bg-slate-900 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950' : 'bg-slate-50 bg-gradient-to-b from-sky-50 via-slate-100 to-slate-200'
        }`}>

            {/* HUD & UI - Rediseñado y responsivo */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-wrap gap-4 justify-between items-start z-10 pointer-events-none">
                <div className="flex gap-4 items-center">
                    <Link to="/entretenimiento" className={`flex items-center font-bold backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto transition-all border ${
                        isDarkMode ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border-white/10' : 'text-slate-700 hover:text-slate-900 bg-black/5 hover:bg-black/10 border-black/10 shadow-sm'
                    }`}>
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        Salir
                    </Link>
                    
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`p-2 rounded-full pointer-events-auto transition-all border backdrop-blur-md ${
                            isDarkMode ? 'text-amber-300 bg-white/10 hover:bg-white/20 border-white/10' : 'text-slate-700 bg-black/5 hover:bg-black/10 border-black/10 shadow-sm'
                        }`}
                        title={isDarkMode ? "Cambiar a Día" : "Cambiar a Noche"}
                    >
                        {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                </div>
                
                <div className="flex gap-2 sm:gap-4 ml-auto">
                    <div className={`backdrop-blur-2xl rounded-3xl px-4 py-2 sm:px-6 sm:py-3 text-center pointer-events-auto border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hidden sm:block transition-all ${
                        isDarkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white/60 border-white/40 text-slate-800'
                    }`}>
                        <h3 className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Récord Mundial</h3>
                        <p className="text-xl sm:text-2xl font-black font-mono leading-none">{bestScore} <span className="text-xs font-medium">pts</span></p>
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

            {/* LEFT SIDE - Leaderboard */}
            <div className="absolute top-24 left-4 sm:left-6 z-20 pointer-events-auto w-48 sm:w-64">
                 <div className={`backdrop-blur-2xl rounded-3xl p-5 border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all ${
                     isDarkMode ? 'bg-[#0f172a]/40 border-white/10' : 'bg-white/60 border-white/40'
                 }`}>
                     <h3 className="text-emerald-400 font-black text-[10px] sm:text-xs uppercase tracking-widest mb-3 flex items-center">
                         <span className="mr-2">🏆</span> Top 10 Oficial
                     </h3>
                     <div className="space-y-2">
                         {isLoadingLeaderboard ? (
                             <div className="text-slate-500 text-xs italic">Cargando...</div>
                         ) : (leaderboard?.length || 0) === 0 ? (
                             <div className="text-slate-500 text-xs italic">Sé el primero en jugar</div>
                         ) : (
                             leaderboard?.filter(Boolean).map((lb: any, idx: number) => (
                                 <div key={lb.id} className="flex justify-between items-center text-xs sm:text-sm">
                                     <div className="flex items-center gap-2 overflow-hidden">
                                         <span className={`font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                                            {idx + 1}.
                                         </span>
                                         <span className={`truncate font-semibold w-24 sm:w-32 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} title={lb.user_name}>
                                            {lb.user_name}
                                         </span>
                                     </div>
                                     <span className={`font-bold tabular-nums pl-1 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                                         {lb.score}
                                     </span>
                                 </div>
                             ))
                         )}
                     </div>
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

            {/* Camera Controls Overlay Removed for Drag to Orbit */}

            {/* Instrucciones Centradas */}
            {(blocks?.length || 0) === 0 && !gameOver && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none opacity-80 animate-pulse w-[90%] md:w-auto">
                    <h2 className={`text-4xl md:text-6xl font-black drop-shadow-2xl tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Ubica Balance</h2>
                    <p className={`text-sm sm:text-lg font-medium drop-shadow-md px-6 py-3 rounded-full inline-block backdrop-blur-sm border ${isDarkMode ? 'text-white/90 bg-black/40 border-white/10' : 'text-slate-800 bg-white/60 border-black/10'}`}>
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
                        className={`absolute inset-0 backdrop-blur-xl flex flex-col items-center justify-center z-30 ${isDarkMode ? 'bg-[#0f172a]/80' : 'bg-slate-200/80'}`}
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className={`p-8 sm:p-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-[90%] text-center border relative overflow-hidden ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200'}`}
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
                            
                            <h2 className={`text-3xl sm:text-4xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>¡Derrumbe!</h2>
                            <p className={`font-medium mb-8 text-sm sm:text-base ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Tu torre colapsó. La estructura no soportó la presión.</p>

                            <div className={`rounded-2xl p-6 mb-8 border ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <span className={`block text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>Puntuación Final</span>
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

            {/* CELEBRACIÓN 100 PUNTOS */}
            <AnimatePresence>
                {showMilestoneCelebration && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
                    >
                        {/* Background particles / flare */}
                        <motion.div 
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ scale: [0, 1.5, 1.2], rotate: 360 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/20 via-teal-400/30 to-emerald-500/20 rounded-full blur-[100px]"
                        />
                        
                        <div className="relative flex flex-col items-center">
                            {/* Logo Animation */}
                            <motion.div
                                initial={{ scale: 0, y: 50, rotate: -10 }}
                                animate={{ scale: 1, y: 0, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                                className="relative mb-8"
                            >
                                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                <img 
                                    src="/logo_ubica.png" 
                                    alt="Ubica Logo" 
                                    className="w-48 h-auto relative drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]" 
                                />
                            </motion.div>

                            {/* Badge/Text */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-center"
                            >
                                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter drop-shadow-2xl">
                                    ¡100 PUNTOS!
                                </h1>
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ delay: 1, duration: 0.8 }}
                                    className="h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent w-full mt-2"
                                />
                                <p className="text-emerald-400 font-black text-xl md:text-2xl mt-4 uppercase tracking-[0.3em] drop-shadow-lg">
                                    Edificio Legendario
                                </p>
                            </motion.div>

                            {/* Confetti particles emulated with motion */}
                            {Array.from({ length: 20 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ 
                                        x: 0, 
                                        y: 0, 
                                        scale: 0,
                                        rotate: 0 
                                    }}
                                    animate={{ 
                                        x: (Math.random() - 0.5) * 800, 
                                        y: (Math.random() - 0.5) * 800, 
                                        scale: [0, 1, 0],
                                        rotate: Math.random() * 720
                                    }}
                                    transition={{ 
                                        duration: 2 + Math.random() * 2, 
                                        repeat: Infinity,
                                        delay: Math.random() * 0.5
                                    }}
                                    className={`absolute w-4 h-4 rounded-sm ${
                                        i % 3 === 0 ? 'bg-emerald-400' : i % 3 === 1 ? 'bg-teal-300' : 'bg-white'
                                    } blur-[1px] opacity-60`}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D RENDER ENGINE */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 50 }}>
                {/* Entorno y Luces Atmosféricas */}
                {isDarkMode ? (
                    <>
                        <ambientLight intensity={0.2} />
                        <directionalLight position={[10, 20, 10]} castShadow intensity={0.5} color="#cbd5e1" shadow-mapSize={[512, 512]} shadow-bias={-0.0001} />
                        <pointLight position={[0, -5, 0]} intensity={2} color="#38bdf8" />
                        <hemisphereLight intensity={0.1} color="#ffffff" groundColor="#000000" />
                        <Sky sunPosition={[-10, -5, -10]} turbidity={10} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.7} />
                        <Environment preset="night" />
                    </>
                ) : (
                    <>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[5, 15, 5]} castShadow intensity={1.5} color="#ffffff" shadow-mapSize={[512, 512]} shadow-bias={-0.0001} />
                        <pointLight position={[0, -5, 0]} intensity={1} color="#f0f9ff" />
                        <hemisphereLight intensity={0.4} color="#bae6fd" groundColor="#cbd5e1" />
                        <Sky sunPosition={[5, 15, 5]} turbidity={0.5} rayleigh={0.5} mieCoefficient={0.025} mieDirectionalG={0.8} />
                        <Environment preset="city" />
                    </>
                )}

                <Physics gravity={[0, -9.81, 0]}>
                    <BasePlatform />

                    {blocks?.filter(Boolean).map((block: any) => (
                        <BuildingBlock
                            key={block.id}
                            id={block.id}
                            position={block.position}
                            rotation={block.rotation}
                            color={block.color}
                            blockType={block.blockType || 'normal'}
                            initialVelocity={block.initialVelocity || [0, 0, 0]}
                            isLogo={block.isLogo || false}
                            onFallOut={handleFallOut}
                        />
                    ))}

                    <CameraRig targetY={highestY} />
                    <ImpactParticles />

                    {!gameOver && (
                        <ConstructionDrone 
                            onDrop={handleDrop} 
                            isSpawning={isSpawning} 
                            targetY={highestY} 
                            nextColor={nextColor} 
                            currentScore={score}
                        />
                    )}
                </Physics>

                <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={20} blur={2.5} far={10} color="#000000" />
                
                {/* Ground Plane for better grounding */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
                    <circleGeometry args={[20, 32]} />
                    <meshStandardMaterial color={isDarkMode ? "#0f172a" : "#f8fafc"} transparent opacity={0.4} roughness={0.8} metalness={0.1} />
                </mesh>

                <EffectComposer multisampling={0}>
                    <Bloom luminanceThreshold={1} mipmapBlur intensity={1.0} />
                    <DepthOfField focusDistance={0.02} focalLength={0.15} bokehScale={2} />
                </EffectComposer> 
            </Canvas>
        </div>
    );
}

