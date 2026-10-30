import { useState, useRef, useEffect, useCallback, useMemo, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, Physics, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { ContactShadows, Edges, Environment, Lightformer, OrbitControls, RoundedBox, Sky, Stars } from '@react-three/drei';
import { ChevronLeftIcon, LockClosedIcon, SunIcon, MoonIcon, SpeakerWaveIcon, SpeakerXMarkIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth, type User } from '../../contexts/AuthContext';
import { apiService, type GameLeaderboardEntry } from '../../services/apiService';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// ─── Piezas ──────────────────────────────────────────────────────────────

/** De qué está hecha la pieza: cambia su peso, cómo agarra y cómo rebota. */
type PieceKind = 'normal' | 'glass' | 'metal' | 'bouncy' | 'logo';
/** Su forma: cada una se apila de una manera. */
type PieceShape = 'box' | 'slab' | 'tower' | 'beam' | 'duplex' | 'logo';

interface Piece {
    kind: PieceKind;
    shape: PieceShape;
    color: string;
}

interface BlockData {
    id: string;
    piece: Piece;
    position: [number, number, number];
    rotation: [number, number, number];
    velocity: [number, number, number];
}

const BLOCK_COLORS = ['#3b82f6', '#10b981', '#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b'];

// Cada material se reconoce a simple vista y se avisa antes de soltarlo
const KIND_INFO: Record<Exclude<PieceKind, 'normal'>, { label: string; tip: string; color: string }> = {
    logo: { label: 'Bloque Ubica', tip: 'Puntos dobles', color: '#ffffff' },
    glass: { label: 'Cristal', tip: 'Resbala: suéltalo bien centrado', color: '#a5f3fc' },
    metal: { label: 'Acero', tip: 'Muy pesado: hace temblar la torre', color: '#94a3b8' },
    bouncy: { label: 'Goma', tip: 'Rebota al caer', color: '#f472b6' },
};

const SHAPE_INFO: Record<Exclude<PieceShape, 'box' | 'logo'>, { label: string; tip: string }> = {
    slab: { label: 'Losa', tip: 'Ancha y baja: buena base para seguir' },
    tower: { label: 'Torreón', tip: 'Redondo: encájalo en el centro' },
    beam: { label: 'Viga', tip: 'Larga: si queda torcida, desequilibra' },
    duplex: { label: 'Dúplex', tip: 'Alto y estrecho: se tambalea' },
};

/** Medidas: ancho (x), alto (y) y fondo (z). En el torreón, x es el diámetro. */
const SHAPE_SIZE: Record<PieceShape, [number, number, number]> = {
    box: [1.5, 1, 1.5],
    slab: [2.2, 0.5, 2.2],
    tower: [1.5, 1.2, 1.5],
    beam: [3.0, 0.45, 0.75],
    duplex: [1.2, 1.7, 1.2],
    logo: [1.6, 1.2, 1.6],
};
const halfHeight = (piece: Piece) => SHAPE_SIZE[piece.shape][1] / 2;

// Densidad (el peso sale del volumen), agarre y rebote de cada material
const PHYSICS: Record<PieceKind, { density: number; friction: number; restitution: number }> = {
    normal: { density: 0.65, friction: 0.85, restitution: 0.05 },
    logo: { density: 0.9, friction: 0.9, restitution: 0.08 },
    glass: { density: 0.55, friction: 0.06, restitution: 0.1 },
    metal: { density: 1.8, friction: 0.7, restitution: 0.02 },
    bouncy: { density: 0.45, friction: 0.9, restitution: 0.75 },
};

/**
 * Las tres primeras plantas son cajas normales, para aprender; luego salen otras formas y materiales,
 * y las formas difíciles (dúplex, viga) solo cuando la torre ya tiene algo de altura.
 */
function randomPiece(floors: number): Piece {
    const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    if (floors < 3) return { kind: 'normal', shape: 'box', color };
    const r = Math.random();
    if (r < 0.08) return { kind: 'logo', shape: 'logo', color: KIND_INFO.logo.color };
    if (r < 0.15) return { kind: 'metal', shape: 'box', color: KIND_INFO.metal.color };
    if (r < 0.22) return { kind: 'glass', shape: 'box', color: KIND_INFO.glass.color };
    if (r < 0.26) return { kind: 'bouncy', shape: 'box', color: KIND_INFO.bouncy.color };
    const s = Math.random();
    if (s < 0.18) return { kind: 'normal', shape: 'slab', color: '#d6d3d1' };
    if (s < 0.34) return { kind: 'normal', shape: 'tower', color };
    if (floors >= 6 && s < 0.46) return { kind: 'normal', shape: 'beam', color: '#64748b' };
    if (floors >= 6 && s < 0.58) return { kind: 'normal', shape: 'duplex', color };
    return { kind: 'normal', shape: 'box', color };
}

/** Lo que se avisa de la siguiente pieza (nada si es una caja normal). */
function pieceInfo(piece: Piece) {
    if (piece.kind !== 'normal') return KIND_INFO[piece.kind];
    if (piece.shape === 'box' || piece.shape === 'logo') return null;
    return SHAPE_INFO[piece.shape];
}

// ─── Puntuación ──────────────────────────────────────────────────────────
// Se puntúa al posarse, por lo bien alineado que queda el bloque con el de debajo.
// Como mucho 3 x combo 5 x 2 (logo) = 30 puntos por bloque: es el tope que comprueba el servidor.
const PERFECT_DISTANCE = 0.3;
const GOOD_DISTANCE = 0.8;
const MAX_COMBO = 5;
const DROP_COOLDOWN_MS = 800;
const FALL_LIMIT_Y = -3;

// ─── Efectos: vibración de cámara, anillos de impacto y sonido ───────────

const _color = new THREE.Color();

const DEBRIS = 60;

const FX = {
    shake: 0,
    /** Viento del momento (lo calcula el dron y empuja también a la torre). */
    wind: new THREE.Vector3(),
    /** Hasta cuándo tiembla la plataforma (performance.now()). */
    quakeUntil: 0,
    rings: Array.from({ length: 10 }, () => ({ born: -1, pos: new THREE.Vector3(), color: new THREE.Color(), size: 1 })),
    next: 0,
    debris: Array.from({ length: DEBRIS }, () => ({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: 0 })),
    nextDebris: 0,
    burst(x: number, y: number, z: number, color: string, size = 1) {
        const ring = this.rings[this.next];
        this.next = (this.next + 1) % this.rings.length;
        ring.born = performance.now();
        ring.pos.set(x, y, z);
        ring.color.set(color);
        ring.size = size;
    },
    /** Polvo y cascotes que salen despedidos con un golpe fuerte. */
    dust(x: number, y: number, z: number, amount: number) {
        for (let i = 0; i < amount; i++) {
            const d = this.debris[this.nextDebris];
            this.nextDebris = (this.nextDebris + 1) % DEBRIS;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;
            d.life = 0.5 + Math.random() * 0.5;
            d.pos.set(x, y, z);
            d.vel.set(Math.cos(angle) * speed, 1.5 + Math.random() * 2.5, Math.sin(angle) * speed);
            d.spin = Math.random() * Math.PI;
        }
    },
};

const MUTE_KEY = 'ubica_balance_muted';

/** Sonidos sintetizados al momento: sin ficheros que descargar. */
const sfx = {
    ctx: null as AudioContext | null,
    muted: (() => { try { return localStorage.getItem(MUTE_KEY) === 'true'; } catch { return false; } })(),
    tone(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number, delay = 0) {
        if (this.muted) return;
        try {
            this.ctx ??= new AudioContext();
            const ctx = this.ctx;
            if (ctx.state === 'suspended') void ctx.resume();
            const start = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, start);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
            gain.gain.setValueAtTime(volume, start);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration + 0.02);
        } catch {
            // Sin audio en este navegador: el juego sigue igual
        }
    },
    drop() { this.tone(520, 0.08, 'triangle', 0.06, 360); },
    thud(speed: number) { this.tone(140, 0.12, 'sine', Math.min(0.2, speed * 0.025), 70); },
    good() { this.tone(660, 0.1, 'triangle', 0.08); },
    perfect(combo: number) {
        const base = 520 + combo * 90;
        this.tone(base, 0.09, 'triangle', 0.09);
        this.tone(base * 1.5, 0.14, 'triangle', 0.09, undefined, 0.08);
    },
    collapse() { this.tone(220, 0.7, 'sawtooth', 0.07, 45); },
};

const vibrate = (pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch { /* no disponible */ }
};

// ─── Seguimiento de la torre ─────────────────────────────────────────────

interface TrackedBody {
    rb: RapierRigidBody;
    piece: Piece;
    half: number;
    born: number;
    landed: boolean;
}

type Bodies = MutableRefObject<Map<string, TrackedBody>>;

interface Handlers {
    onLanded: (id: string, offset: number, at: THREE.Vector3, piece: Piece) => void;
    onFallOut: () => void;
}

/**
 * Cada fotograma: qué bloques se han posado (y cómo de alineados con el de debajo), dónde está la
 * cima de la torre y si alguno se ha caído de la plataforma.
 */
function TowerTracker({ bodies, top, handlers }: { bodies: Bodies; top: MutableRefObject<THREE.Vector3>; handlers: MutableRefObject<Handlers> }) {
    const landedPos = useMemo(() => new THREE.Vector3(), []);

    useFrame((_, delta) => {
        const now = performance.now();
        const dt = Math.min(delta, 1 / 30);
        const windy = FX.wind.lengthSq() > 0.0001;
        let topX = 0, topY = 0, topZ = 0;
        const justLanded: [string, TrackedBody][] = [];

        bodies.current.forEach((body, id) => {
            const p = body.rb.translation();
            if (p.y < FALL_LIMIT_Y) {
                handlers.current.onFallOut();
                return;
            }
            if (!body.landed) {
                const v = body.rb.linvel();
                const age = now - body.born;
                if ((age > 250 && Math.hypot(v.x, v.y, v.z) < 0.6) || age > 3000) {
                    body.landed = true;
                    justLanded.push([id, body]);
                } else {
                    return; // aún cayendo: no cuenta como cima
                }
            }
            // El viento empuja más cuanto más alta está la planta: la torre se mece
            if (windy && p.y > 2) {
                const push = 1.2 * body.rb.mass() * Math.min(1, p.y / 15) * dt;
                body.rb.applyImpulse({ x: FX.wind.x * push, y: 0, z: FX.wind.z * push }, true);
            }
            if (p.y + body.half > topY) {
                topX = p.x; topY = p.y + body.half; topZ = p.z;
            }
        });
        top.current.set(topX, topY, topZ);

        for (const [id, body] of justLanded) {
            const p = body.rb.translation();
            // El apoyo es el bloque posado más alto que queda por debajo; sin ninguno, el centro de la plataforma
            let supportX = 0, supportZ = 0, supportY = -Infinity;
            bodies.current.forEach((other, otherId) => {
                if (otherId === id || !other.landed) return;
                const q = other.rb.translation();
                if (q.y < p.y - 0.3 && q.y > supportY) {
                    supportY = q.y; supportX = q.x; supportZ = q.z;
                }
            });
            landedPos.set(p.x, p.y - body.half, p.z);
            handlers.current.onLanded(id, Math.hypot(p.x - supportX, p.z - supportZ), landedPos, body.piece);
        }
    });

    return null;
}

// ─── Escena ──────────────────────────────────────────────────────────────

/** El solar: una losa que, de vez en cuando, tiembla (terremoto). */
function BasePlatform({ isDarkMode }: { isDarkMode: boolean }) {
    const ref = useRef<RapierRigidBody>(null);
    const shaking = useRef(false);

    useFrame(({ clock }) => {
        const rb = ref.current;
        if (!rb) return;
        if (performance.now() < FX.quakeUntil) {
            const t = clock.getElapsedTime();
            shaking.current = true;
            rb.setNextKinematicTranslation({ x: Math.sin(t * 31) * 0.07, y: -0.5, z: Math.cos(t * 23) * 0.05 });
            FX.shake = Math.max(FX.shake, 0.06);
        } else if (shaking.current) {
            shaking.current = false;
            rb.setNextKinematicTranslation({ x: 0, y: -0.5, z: 0 });
        }
    });

    return (
        <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[0, -0.5, 0]}>
            <CuboidCollider args={[2.5, 0.5, 2.5]} friction={1} restitution={0.1} />
            <mesh receiveShadow castShadow>
                <boxGeometry args={[5, 1, 5]} />
                <meshStandardMaterial color={isDarkMode ? '#94a3b8' : '#cbd5e1'} roughness={0.95} />
                <Edges scale={1} threshold={15} color="#64748b" />
            </mesh>
            {/* Borde de obra, a franjas amarillas y negras */}
            {Array.from({ length: 4 }).map((_, side) => (
                <group key={side} rotation={[0, side * Math.PI / 2, 0]}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <mesh key={i} position={[-2.25 + i * 0.5, 0.51, 2.4]}>
                            <boxGeometry args={[0.5, 0.02, 0.2]} />
                            <meshStandardMaterial color={i % 2 ? '#0f172a' : '#facc15'} roughness={0.8} />
                        </mesh>
                    ))}
                </group>
            ))}
            {/* Diana del centro: ahí empieza la torre */}
            <mesh position={[0, 0.502, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.75, 32]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
            </mesh>
        </RigidBody>
    );
}

/** Ciudad de fondo, siempre la misma: da escala a la torre. */
function CityBackdrop({ isDarkMode }: { isDarkMode: boolean }) {
    const buildings = useMemo(() => {
        let seed = 7;
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        return Array.from({ length: 28 }, (_, i) => {
            const angle = (i / 28) * Math.PI * 2 + rand() * 0.15;
            const radius = 40 + rand() * 14;
            const w = 3 + rand() * 4;
            const h = 4 + rand() * 18;
            return { position: [Math.cos(angle) * radius, h / 2 - 0.5, Math.sin(angle) * radius] as [number, number, number], size: [w, h, w] as [number, number, number], lit: rand() > 0.4 };
        });
    }, []);

    return (
        <group>
            {buildings.map((b, i) => (
                <mesh key={i} position={b.position} receiveShadow>
                    <boxGeometry args={b.size} />
                    <meshStandardMaterial
                        color={isDarkMode ? '#1e293b' : '#cbd5e1'}
                        emissive={isDarkMode && b.lit ? '#fde68a' : '#000000'}
                        emissiveIntensity={isDarkMode && b.lit ? 0.05 : 0}
                        roughness={0.9}
                    />
                </mesh>
            ))}
        </group>
    );
}

// Ventanas: cristal que refleja el cielo y, en algunas, la luz encendida
const windowGlass = new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.7, roughness: 0.12 });
const windowLit = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#fbbf24', emissiveIntensity: 0.9 });
const concrete = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.9 });
const steel = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.85, roughness: 0.35 });

interface WindowSpot { position: [number, number, number]; rotation: [number, number, number]; size: [number, number]; lit: boolean }

/** Ventanas repartidas por las cuatro fachadas de una pieza con forma de caja. */
function boxWindows([w, h, d]: [number, number, number]): WindowSpot[] {
    const rows = h > 1.3 ? 2 : h >= 0.9 ? 1 : 0;
    const spots: WindowSpot[] = [];
    let n = 0;
    for (let side = 0; side < 4; side++) {
        const a = side * Math.PI / 2;
        const faceWidth = side % 2 === 0 ? w : d;
        const out = (side % 2 === 0 ? d : w) / 2 + 0.002;
        const cols = Math.max(1, Math.floor(faceWidth / 0.7));
        for (let row = 0; row < rows; row++) {
            const y = rows === 1 ? 0.03 : (row === 0 ? -h / 4 : h / 4);
            for (let col = 0; col < cols; col++) {
                const along = (col - (cols - 1) / 2) * (faceWidth / cols);
                spots.push({
                    position: [Math.sin(a) * out + Math.cos(a) * along, y, Math.cos(a) * out - Math.sin(a) * along],
                    rotation: [0, a, 0],
                    size: [Math.min(0.42, faceWidth / cols * 0.6), Math.min(0.4, h / rows * 0.45)],
                    lit: (n++ * 7 + side * 3) % 10 < 3,
                });
            }
        }
    }
    return spots;
}

/** Ventanas alrededor del torreón. */
const TOWER_WINDOWS: WindowSpot[] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { position: [Math.sin(a) * 0.752, 0.03, Math.cos(a) * 0.752], rotation: [0, a, 0], size: [0.32, 0.45], lit: i % 3 === 0 };
});

const WINDOWS: Partial<Record<PieceShape, WindowSpot[]>> = {
    box: boxWindows(SHAPE_SIZE.box),
    duplex: boxWindows(SHAPE_SIZE.duplex),
    tower: TOWER_WINDOWS,
};

function PieceMaterial({ piece }: { piece: Piece }) {
    switch (piece.kind) {
        case 'glass':
            return <meshStandardMaterial color={piece.color} roughness={0.05} metalness={0.2} transparent opacity={0.6} />;
        case 'metal':
            return <meshStandardMaterial color={piece.color} roughness={0.3} metalness={0.95} />;
        case 'bouncy':
            return <meshPhysicalMaterial color={piece.color} roughness={0.35} clearcoat={1} clearcoatRoughness={0.1} />;
        case 'logo':
            return <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.4} />;
        default:
            return <meshStandardMaterial color={piece.color} roughness={0.75} metalness={0.05} />;
    }
}

function Windows({ spots }: { spots?: WindowSpot[] }) {
    return (
        <>
            {spots?.map((w, i) => (
                <mesh key={i} position={w.position} rotation={w.rotation} material={w.lit ? windowLit : windowGlass}>
                    <planeGeometry args={w.size} />
                </mesh>
            ))}
        </>
    );
}

/** El aspecto de una pieza: igual colgada del dron que ya en la torre. */
function PieceMesh({ piece }: { piece: Piece }) {
    const [w, h, d] = SHAPE_SIZE[piece.shape];

    if (piece.shape === 'beam') {
        // Viga de acero en doble T
        return (
            <group>
                <mesh castShadow receiveShadow position={[0, h / 2 - 0.04, 0]} material={steel}><boxGeometry args={[w, 0.08, d]} /></mesh>
                <mesh castShadow receiveShadow position={[0, -h / 2 + 0.04, 0]} material={steel}><boxGeometry args={[w, 0.08, d]} /></mesh>
                <mesh castShadow receiveShadow material={steel}><boxGeometry args={[w, h - 0.16, 0.12]} /></mesh>
            </group>
        );
    }

    if (piece.shape === 'tower') {
        return (
            <group>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[w / 2, w / 2, h, 28]} />
                    <PieceMaterial piece={piece} />
                </mesh>
                <mesh position={[0, h / 2 - 0.07, 0]} material={concrete}><cylinderGeometry args={[w / 2 + 0.03, w / 2 + 0.03, 0.08, 28]} /></mesh>
                <Windows spots={WINDOWS.tower} />
            </group>
        );
    }

    const glass = piece.kind === 'glass';
    return (
        <group>
            {glass ? (
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[w, h, d]} />
                    <PieceMaterial piece={piece} />
                    <Edges scale={1} threshold={15} color="#e0f2fe" />
                </mesh>
            ) : (
                <RoundedBox args={[w, h, d]} radius={0.05} smoothness={2} castShadow receiveShadow>
                    <PieceMaterial piece={piece} />
                </RoundedBox>
            )}
            {/* Canto del forjado: separa una planta de la siguiente */}
            {!glass && piece.shape !== 'slab' && (
                <mesh position={[0, h / 2 - 0.07, 0]} material={concrete}><boxGeometry args={[w + 0.04, 0.08, d + 0.04]} /></mesh>
            )}
            {piece.shape === 'logo' ? (
                [0, Math.PI].map(r => (
                    <mesh key={r} position={[Math.sin(r) * 0.801, 0, Math.cos(r) * 0.801]} rotation={[0, r, 0]}>
                        <boxGeometry args={[0.5, 0.5, 0.05]} />
                        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
                    </mesh>
                ))
            ) : piece.kind === 'normal' || piece.kind === 'bouncy' ? (
                <Windows spots={WINDOWS[piece.shape]} />
            ) : null}
        </group>
    );
}

/** El cuerpo físico de la pieza, ajustado a su forma (el peso sale de su volumen y material). */
function PieceCollider({ piece }: { piece: Piece }) {
    const [w, h, d] = SHAPE_SIZE[piece.shape];
    const { density, friction, restitution } = PHYSICS[piece.kind];
    return piece.shape === 'tower'
        ? <CylinderCollider args={[h / 2, w / 2]} density={density} friction={friction} restitution={restitution} />
        : <CuboidCollider args={[w / 2, h / 2, d / 2]} density={density} friction={friction} restitution={restitution} />;
}

// Temporales reutilizados en cada fotograma (sin crear objetos nuevos 60 veces por segundo)
const _dronePos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _accel = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const ROPE_SEGMENTS = 8;
const ROPE_LENGTH = 2.5;
const DOT_COLORS = { perfect: new THREE.Color('#fbbf24'), good: new THREE.Color('#10b981'), off: new THREE.Color('#94a3b8'), busy: new THREE.Color('#ef4444') };

type DropFn = () => Pick<BlockData, 'position' | 'rotation' | 'velocity'> | null;

/** El dron que lleva la siguiente pieza colgada de un cable con física de péndulo. */
function ConstructionDrone({ floors, isSpawning, piece, top, dropRef }: {
    floors: number;
    isSpawning: boolean;
    piece: Piece;
    top: MutableRefObject<THREE.Vector3>;
    dropRef: MutableRefObject<DropFn | null>;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const shadowDotRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const ropeSegmentsRef = useRef<THREE.Group>(null);
    const hookVisualRef = useRef<THREE.Group>(null);
    const heldBlockRef = useRef<THREE.Group>(null);
    const { rapier, world } = useRapier();

    const sim = useRef({
        time: 0,
        ready: false,
        y: 6,
        cx: 0,
        cz: 0,
        prevPos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        hookPos: new THREE.Vector3(0, -ROPE_LENGTH, 0),
        hookVel: new THREE.Vector3(),
        rope: Array.from({ length: ROPE_SEGMENTS + 1 }, () => new THREE.Vector3()),
    });

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        const s = sim.current;
        // Al volver a la pestaña llega un delta enorme: se limita para que el cable no salga disparado
        const dt = Math.min(delta, 1 / 30);
        s.time += dt;
        const t = s.time;

        // --- Dificultad: va subiendo con las plantas, no con los puntos ---
        const speed = 0.7 + Math.min(1.0, Math.max(0, floors - 5) * 0.03);
        // Al principio el vaivén no pasa del borde de la plataforma; luego se abre
        const swingX = 2.2 + Math.min(1.3, floors * 0.08);
        const swingZ = 1.0 + Math.min(0.5, floors * 0.04);
        const windIntensity = Math.min(1, Math.max(0, floors - 10) / 25) * 0.5;
        const spin = floors >= 25 ? Math.min(1.2, 0.4 + (floors - 25) * 0.04) : 0;
        const windX = Math.sin(t * 0.5) * Math.cos(t * 0.3) * windIntensity;
        const windZ = Math.cos(t * 0.4) * Math.sin(t * 0.6) * windIntensity;
        FX.wind.set(windX, 0, windZ);

        // Sigue a la cima de la torre, con suavidad
        const follow = 1 - Math.exp(-dt * 1.5);
        const targetY = top.current.y + 5.5;
        if (!s.ready) {
            s.y = targetY;
            s.cx = top.current.x;
            s.cz = top.current.z;
        }
        s.y += (targetY - s.y) * follow;
        s.cx += (top.current.x - s.cx) * follow;
        s.cz += (top.current.z - s.cz) * follow;

        _dronePos.set(
            s.cx + Math.sin(t * speed) * swingX + windX * 5,
            s.y,
            s.cz + Math.cos(t * speed * 0.8) * swingZ + windZ * 5,
        );
        if (!s.ready) {
            s.prevPos.copy(_dronePos);
            s.ready = true;
            return;
        }

        _vel.copy(_dronePos).sub(s.prevPos).divideScalar(dt || 0.016);
        _accel.copy(_vel).sub(s.vel).divideScalar(dt || 0.016);
        s.vel.copy(_vel);
        s.prevPos.copy(_dronePos);

        group.position.copy(_dronePos);
        const tilt = floors < 5 ? 0.05 : 0.15;
        group.rotation.set(Math.sin(t * speed * 0.8) * -tilt, t * spin, Math.cos(t * speed) * tilt);
        group.updateMatrixWorld();

        // --- Cable y gancho (en el espacio del dron) ---
        _invQuat.copy(group.quaternion).invert();
        const hookVel = s.hookVel;
        const hookPos = s.hookPos;
        hookVel.addScaledVector(_tmp.set(0, -9.81, 0).applyQuaternion(_invQuat), dt); // gravedad
        hookVel.addScaledVector(_accel.applyQuaternion(_invQuat), -0.8 * dt); // inercia del dron
        _tmp.copy(hookPos).negate(); // del gancho al dron
        const stretch = _tmp.length() - ROPE_LENGTH;
        hookVel.addScaledVector(_tmp.normalize(), stretch * 300 * dt); // el cable como un muelle rígido
        hookVel.addScaledVector(_tmp.set(windX, 0, windZ).applyQuaternion(_invQuat), 15 * dt); // viento
        hookVel.multiplyScalar(0.96);
        hookPos.addScaledVector(hookVel, dt);
        if (isSpawning) hookVel.y += 8 * dt; // retroceso al soltar

        // Curva del cable: una cuadrática con algo de comba según la velocidad del gancho
        _tmp2.copy(hookPos).multiplyScalar(0.5).addScaledVector(hookVel, -0.05);
        for (let i = 0; i <= ROPE_SEGMENTS; i++) {
            const u = i / ROPE_SEGMENTS;
            s.rope[i].set(0, 0, 0)
                .addScaledVector(_tmp2, 2 * (1 - u) * u)
                .addScaledVector(hookPos, u * u);
        }
        const segments = ropeSegmentsRef.current?.children as THREE.Mesh[] | undefined;
        if (segments) {
            for (let i = 0; i < ROPE_SEGMENTS; i++) {
                const mesh = segments[i];
                if (!mesh) continue;
                const a = s.rope[i];
                const b = s.rope[i + 1];
                _tmp.subVectors(b, a);
                const len = _tmp.length();
                mesh.position.addVectors(a, b).multiplyScalar(0.5);
                mesh.quaternion.setFromUnitVectors(_up, len > 0.001 ? _tmp.divideScalar(len) : _up);
                mesh.scale.set(1, Math.max(len, 0.001), 1);
            }
        }

        if (hookVisualRef.current) {
            hookVisualRef.current.position.copy(hookPos);
            _tmp.copy(hookPos).negate().normalize();
            hookVisualRef.current.quaternion.setFromUnitVectors(_up, _tmp);
        }

        if (ringRef.current) {
            const mat = ringRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = isSpawning ? 3 : 1 + Math.sin(t * 5) * 0.5;
        }

        // --- Punto de caída: dónde aterrizaría ahora y cómo de bien alineado quedaría ---
        const dot = shadowDotRef.current;
        if (dot && rapier && world) {
            _tmp.copy(hookPos).applyMatrix4(group.matrixWorld);
            const ray = new rapier.Ray(_tmp, { x: 0, y: -1, z: 0 });
            const hit = world.castRay(ray, 60, true);
            if (hit) {
                const p = ray.pointAt(hit.timeOfImpact);
                dot.position.set(p.x, p.y + 0.03, p.z);
                dot.visible = true;
            } else {
                dot.visible = false; // fuera de la plataforma
            }
            const offset = Math.hypot(dot.position.x - top.current.x, dot.position.z - top.current.z);
            const mat = dot.material as THREE.MeshBasicMaterial;
            mat.color.copy(isSpawning ? DOT_COLORS.busy : offset < PERFECT_DISTANCE ? DOT_COLORS.perfect : offset < GOOD_DISTANCE ? DOT_COLORS.good : DOT_COLORS.off);
            mat.opacity = isSpawning ? 0.7 : 0.45 + Math.sin(t * 8) * 0.2;
            const scale = Math.max(0.5, 1.2 - Math.min(1, Math.max(0, floors - 5) * 0.03) * 0.7);
            dot.scale.set(scale, scale, 1);
        }
    });

    // La partida pide la posición exacta de la pieza en el momento de soltarla
    useEffect(() => {
        dropRef.current = () => {
            const group = groupRef.current;
            const held = heldBlockRef.current;
            if (!group || !held) return null;
            held.getWorldPosition(_tmp);
            held.getWorldQuaternion(_quat);
            _euler.setFromQuaternion(_quat);
            _tmp2.copy(sim.current.hookVel).applyQuaternion(group.quaternion);
            return {
                position: [_tmp.x, _tmp.y, _tmp.z],
                rotation: [_euler.x, _euler.y, _euler.z],
                velocity: [_tmp2.x * 2, 0, _tmp2.z * 2],
            };
        };
        return () => { dropRef.current = null; };
    });

    // Sin dron (fin de partida) no hay viento
    useEffect(() => () => { FX.wind.set(0, 0, 0); }, []);

    const half = halfHeight(piece);

    return (
        <>
            <group ref={groupRef}>
                <mesh castShadow>
                    <boxGeometry args={[1.2, 0.4, 1.2]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                    <Edges scale={1} threshold={15} color="#0f172a" />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh ref={ringRef} position={[0, -0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.3, 0.05, 16, 32]} />
                    <meshStandardMaterial color={isSpawning ? '#ef4444' : '#10b981'} emissive={isSpawning ? '#ef4444' : '#10b981'} emissiveIntensity={3} toneMapped={false} />
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
                        <Rotor />
                    </group>
                ))}

                <group ref={ropeSegmentsRef}>
                    {Array.from({ length: ROPE_SEGMENTS }).map((_, i) => (
                        <mesh key={i}>
                            <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
                            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.3} />
                        </mesh>
                    ))}
                </group>

                <group ref={hookVisualRef}>
                    <mesh>
                        <boxGeometry args={[0.6, 0.1, 0.6]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0.3, -0.1, 0]} rotation={[0, 0, isSpawning ? -Math.PI / 3 : -Math.PI / 8]}>
                        <boxGeometry args={[0.05, 0.4, 0.4]} />
                        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
                    </mesh>
                    <mesh position={[-0.3, -0.1, 0]} rotation={[0, 0, isSpawning ? Math.PI / 3 : Math.PI / 8]}>
                        <boxGeometry args={[0.05, 0.4, 0.4]} />
                        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
                    </mesh>
                    {!isSpawning && (
                        <group position={[0, -0.1 - half, 0]} ref={heldBlockRef}>
                            <PieceMesh piece={piece} />
                        </group>
                    )}
                </group>
            </group>

            <mesh ref={shadowDotRef} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.4, 32]} />
                <meshBasicMaterial transparent opacity={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
                <mesh position={[0, 0, 0.01]}>
                    <circleGeometry args={[0.1, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
                </mesh>
            </mesh>
        </>
    );
}

function Rotor() {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 40; });
    return (
        <mesh ref={ref} position={[0, 0.24, 0]}>
            <boxGeometry args={[0.8, 0.02, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.55} metalness={0.5} roughness={0.2} />
        </mesh>
    );
}

/** Anillos que se abren y se desvanecen donde algo choca o encaja. */
const _debrisMatrix = new THREE.Matrix4();

function ImpactRings() {
    const refs = useRef<(THREE.Mesh | null)[]>([]);
    const debrisRef = useRef<THREE.InstancedMesh>(null);
    useFrame((_, delta) => {
        const now = performance.now();
        FX.rings.forEach((ring, i) => {
            const mesh = refs.current[i];
            if (!mesh) return;
            const age = (now - ring.born) / 1000;
            if (ring.born < 0 || age > 0.6) {
                mesh.visible = false;
                return;
            }
            mesh.visible = true;
            mesh.position.copy(ring.pos);
            const s = ring.size * (1 + age * 5);
            mesh.scale.set(s, s, s);
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.color.copy(ring.color);
            mat.opacity = 0.7 * (1 - age / 0.6);
        });

        // Cascotes: caen con gravedad y se encogen al apagarse
        const debris = debrisRef.current;
        if (!debris) return;
        const dt = Math.min(delta, 1 / 30);
        FX.debris.forEach((d, i) => {
            if (d.life > 0) {
                d.life -= dt;
                d.vel.y -= 9.81 * dt;
                d.pos.addScaledVector(d.vel, dt);
                if (d.pos.y < -0.45 && Math.abs(d.pos.x) < 2.5 && Math.abs(d.pos.z) < 2.5) {
                    d.pos.y = -0.45; d.vel.set(d.vel.x * 0.4, Math.abs(d.vel.y) * 0.25, d.vel.z * 0.4);
                }
                d.spin += dt * 8;
            }
            const size = d.life > 0 ? 0.09 * Math.min(1, d.life * 3) : 0;
            _debrisMatrix.compose(d.pos, _quat.setFromEuler(_euler.set(d.spin, d.spin * 0.7, 0)), _tmp.setScalar(size));
            debris.setMatrixAt(i, _debrisMatrix);
        });
        debris.instanceMatrix.needsUpdate = true;
    });
    return (
        <>
            <instancedMesh ref={debrisRef} args={[undefined, undefined, DEBRIS]} castShadow frustumCulled={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#a8a29e" roughness={0.9} />
            </instancedMesh>
            {FX.rings.map((_, i) => (
                <mesh key={i} ref={el => { refs.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
                    <ringGeometry args={[0.35, 0.5, 32]} />
                    <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </>
    );
}

function BuildingBlock({ block, bodies }: { block: BlockData; bodies: Bodies }) {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const { piece } = block;
    const half = halfHeight(piece);

    useEffect(() => {
        const rb = rigidBodyRef.current;
        if (!rb) return;
        const map = bodies.current;
        map.set(block.id, { rb, piece, half, born: performance.now(), landed: false });
        return () => { map.delete(block.id); };
    }, [block.id, bodies, piece, half]);

    const handleCollision = () => {
        const rb = rigidBodyRef.current;
        if (!rb) return;
        const v = rb.linvel();
        const speed = Math.hypot(v.x, v.y, v.z);
        if (speed < 1.5) return;
        const mass = rb.mass();
        const p = rb.translation();
        FX.shake = Math.max(FX.shake, Math.min(0.25, speed * mass * 0.008));
        FX.burst(p.x, p.y - half + 0.02, p.z, piece.kind === 'logo' ? '#10b981' : piece.color, 1.2);
        // Los golpes fuertes levantan polvo y cascotes
        if (speed * mass > 6) FX.dust(p.x, p.y - half, p.z, Math.min(10, Math.round(speed * mass / 2)));
        sfx.thud(speed * mass * 0.4);
    };

    return (
        <RigidBody
            ref={rigidBodyRef}
            type="dynamic"
            colliders={false}
            position={block.position}
            rotation={block.rotation}
            linearDamping={0.12}
            angularDamping={0.35}
            linearVelocity={block.velocity}
            ccd
            onCollisionEnter={handleCollision}
        >
            <PieceCollider piece={piece} />
            <PieceMesh piece={piece} />
        </RigidBody>
    );
}

/** Cámara que sube con la torre (moviendo también su posición) y tiembla con los golpes. */
function CameraRig({ top }: { top: MutableRefObject<THREE.Vector3> }) {
    const { camera, size } = useThree();
    const controlsRef = useRef<any>(null);
    const shakeOffset = useRef(new THREE.Vector3());

    // En el móvil en vertical, más lejos para que quepa todo el recorrido del dron (solo al empezar:
    // la barra del navegador cambia el alto al hacer scroll y no debe mover la cámara)
    const framed = useRef(false);
    useEffect(() => {
        if (framed.current) return;
        framed.current = true;
        if (size.width / size.height < 0.8) camera.position.set(0, 10, 17);
    }, [camera, size.width, size.height]);

    useFrame((_, delta) => {
        const controls = controlsRef.current;
        camera.position.sub(shakeOffset.current);
        shakeOffset.current.set(0, 0, 0);

        if (controls) {
            const desired = top.current.y * 0.85;
            const next = THREE.MathUtils.lerp(controls.target.y, desired, 1 - Math.exp(-Math.min(delta, 0.1) * 2));
            camera.position.y += next - controls.target.y;
            controls.target.y = next;
            controls.update();
        }

        if (FX.shake > 0) {
            shakeOffset.current.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(FX.shake);
            camera.position.add(shakeOffset.current);
            FX.shake *= 0.88;
            if (FX.shake < 0.005) FX.shake = 0;
        }
    });

    // Girar la cámara: botón derecho o dos dedos. El clic izquierdo y el toque con un dedo sueltan la pieza
    return (
        <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.1}
            minPolarAngle={0.1}
            maxDistance={32}
            minDistance={9}
            mouseButtons={{ LEFT: undefined as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
            touches={{ ONE: undefined as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        />
    );
}

// La sombra del sol cubre una torre alta, no solo la base
const SHADOW_CAMERA = { 'shadow-camera-left': -10, 'shadow-camera-right': 10, 'shadow-camera-top': 30, 'shadow-camera-bottom': -6, 'shadow-camera-far': 80 };

function Lighting({ isDarkMode }: { isDarkMode: boolean }) {
    return isDarkMode ? (
        <>
            <ambientLight intensity={0.35} />
            <directionalLight position={[10, 20, 10]} castShadow intensity={0.8} color="#cbd5e1" shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} {...SHADOW_CAMERA} />
            <pointLight position={[0, -5, 0]} intensity={2} color="#38bdf8" />
            <hemisphereLight intensity={0.15} color="#ffffff" groundColor="#000000" />
            <Sky sunPosition={[-10, -5, -10]} turbidity={10} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.7} />
            <Stars radius={90} depth={40} count={1500} factor={3} fade speed={0.5} />
        </>
    ) : (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 15, 5]} castShadow intensity={1.5} color="#ffffff" shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} {...SHADOW_CAMERA} />
            <pointLight position={[0, -5, 0]} intensity={1} color="#f0f9ff" />
            <hemisphereLight intensity={0.4} color="#bae6fd" groundColor="#cbd5e1" />
            <Sky sunPosition={[5, 15, 5]} turbidity={0.5} rayleigh={0.5} mieCoefficient={0.025} mieDirectionalG={0.8} />
        </>
    );
}

/** Reflejos para el acero y el cristal, generados aquí mismo: sin descargar mapas HDR de fuera. */
function LocalEnvironment({ isDarkMode }: { isDarkMode: boolean }) {
    const intensity = isDarkMode ? 0.5 : 1.6;
    return (
        <Environment key={isDarkMode ? 'night' : 'day'} resolution={128}>
            <color attach="background" args={[isDarkMode ? '#0b1220' : '#dbeafe']} />
            <Lightformer intensity={intensity} position={[0, 6, -10]} scale={[14, 6, 1]} />
            <Lightformer intensity={intensity * 0.7} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[12, 3, 1]} />
            <Lightformer intensity={intensity * 0.7} position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[12, 3, 1]} />
            <Lightformer form="ring" color={isDarkMode ? '#38bdf8' : '#ffffff'} intensity={intensity * 1.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={5} />
        </Environment>
    );
}

// ─── Pantalla para quien no ha entrado ───────────────────────────────────

function LoginGate() {
    const [error, setError] = useState('');
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 flex flex-col items-center justify-center p-4 transition-colors">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LockClosedIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">La Torre Fincas (3D)</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Apila plantas con el dron sin que se te caiga el edificio. Entra con tu cuenta para guardar tu puntuación en el ranking del mes.
                </p>
                {/* Al entrar con Google la partida empieza aquí mismo */}
                <GoogleSignInButton mode="signin" onSuccess={() => setError('')} onError={setError} />
                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Link
                    to="/login"
                    state={{ from: { pathname: '/entretenimiento/balance' } }}
                    className="block w-full mt-4 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                >
                    Entrar con email
                </Link>
                <Link to="/entretenimiento" className="block w-full mt-4 text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                    Volver a Ubica Play
                </Link>
            </div>
        </div>
    );
}

// ─── Partida ─────────────────────────────────────────────────────────────

const BEST_KEY = 'ubica_balance_best';
const readNumber = (key: string) => { try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; } };

interface Callout {
    text: string;
    tone: 'perfect' | 'good' | 'logo' | 'alert' | 'milestone';
    key: number;
}

function TowerGame({ user }: { user: User }) {
    const [blocks, setBlocks] = useState<BlockData[]>([]);
    const [floors, setFloors] = useState(0);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [isSpawning, setIsSpawning] = useState(false);
    const [nextPiece, setNextPiece] = useState<Piece>(() => randomPiece(0));
    const [callout, setCallout] = useState<Callout | null>(null);
    const [best, setBest] = useState(() => readNumber(BEST_KEY));
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
    const [showBoard, setShowBoard] = useState(() => window.innerWidth >= 640);
    const [showMilestone, setShowMilestone] = useState(false);
    const [muted, setMuted] = useState(sfx.muted);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try { return localStorage.getItem('ubica_balance_dark_mode') !== 'false'; } catch { return true; }
    });

    useEffect(() => {
        try { localStorage.setItem('ubica_balance_dark_mode', String(isDarkMode)); } catch { /* sin almacenamiento */ }
    }, [isDarkMode]);

    const toggleMute = () => {
        sfx.muted = !sfx.muted;
        setMuted(sfx.muted);
        try { localStorage.setItem(MUTE_KEY, String(sfx.muted)); } catch { /* sin almacenamiento */ }
    };

    // Estado que leen el bucle de render y los eventos de teclado sin esperar a React
    const bodies = useRef(new Map<string, TrackedBody>());
    const top = useRef(new THREE.Vector3());
    const dropRef = useRef<DropFn | null>(null);
    const game = useRef({ over: false, overAt: 0, spawning: false, score: 0, combo: 1, floors: 0, celebrated: false, round: 0, seq: 0 });
    const nextPieceRef = useRef(nextPiece);
    nextPieceRef.current = nextPiece;
    const calloutTimer = useRef<number>();

    // Token de la partida en curso: el servidor comprueba que la puntuación cabe en el tiempo jugado
    const gameTokenRef = useRef<string | null>(null);
    const startGameSession = useCallback(() => {
        gameTokenRef.current = null;
        apiService.startBalanceGame().then(t => { gameTokenRef.current = t; }).catch(() => { /* sin token no se guarda la puntuación */ });
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLeaderboard(await apiService.getBalanceLeaderboard());
        } catch (error) {
            console.error('Failed to fetch leaderboard', error);
            setLeaderboard([]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
        startGameSession();
    }, [fetchLeaderboard, startGameSession]);

    const myEntry = leaderboard.findIndex(lb => lb.user_id === user.id);
    const personalBest = Math.max(best, myEntry >= 0 ? leaderboard[myEntry].score : 0);

    const showCallout = (text: string, tone: Callout['tone']) => {
        setCallout({ text, tone, key: performance.now() });
        window.clearTimeout(calloutTimer.current);
        calloutTimer.current = window.setTimeout(() => setCallout(null), 1100);
    };

    // El bucle de la escena llama a estas funciones: se guardan en una ref para que lean siempre lo último
    const handlers = useRef<Handlers>({ onLanded: () => {}, onFallOut: () => {} });
    handlers.current = {
        onLanded: (_id, offset, at, piece) => {
            const g = game.current;
            if (g.over) return;
            let pts = 1;
            if (offset < PERFECT_DISTANCE) {
                pts = 3 * g.combo;
                g.combo = Math.min(g.combo + 1, MAX_COMBO);
                FX.burst(at.x, at.y, at.z, '#fbbf24', 2);
                sfx.perfect(g.combo);
                vibrate(15);
            } else if (offset < GOOD_DISTANCE) {
                pts = 2 * g.combo;
                g.combo = 1;
                sfx.good();
            } else {
                g.combo = 1;
            }
            if (piece.kind === 'logo') pts *= 2;

            if (piece.kind === 'logo') showCallout(`¡UBICA! +${pts}`, 'logo');
            else if (offset < PERFECT_DISTANCE) showCallout(`¡PERFECTO! +${pts}`, 'perfect');
            else if (offset < GOOD_DISTANCE) showCallout(`¡BIEN! +${pts}`, 'good');

            g.score += pts;
            g.floors += 1;
            // Cada 10 plantas desde la 15, un terremoto: la torre tiene que aguantarlo
            if (g.floors >= 15 && g.floors % 10 === 5) {
                window.setTimeout(() => {
                    if (game.current.over || game.current.round !== g.round) return;
                    FX.quakeUntil = performance.now() + 2500;
                    showCallout('¡TERREMOTO!', 'alert');
                    sfx.collapse();
                    vibrate([60, 40, 60, 40, 60]);
                }, 1200);
            } else if (g.floors % 10 === 0) {
                window.setTimeout(() => {
                    if (!game.current.over && game.current.round === g.round) showCallout(`¡${g.floors} PLANTAS!`, 'milestone');
                }, 900);
            }
            setScore(g.score);
            setFloors(g.floors);
            setCombo(g.combo);
            if (g.score >= 100 && !g.celebrated) {
                g.celebrated = true;
                setShowMilestone(true);
                window.setTimeout(() => setShowMilestone(false), 4000);
            }
        },
        onFallOut: () => {
            const g = game.current;
            if (g.over) return;
            g.over = true;
            g.overAt = performance.now();
            setGameOver(true);
            sfx.collapse();
            vibrate([40, 30, 80]);
            FX.shake = 0.3;
        },
    };

    // Fin de la partida: récord personal y puntuación al ranking
    useEffect(() => {
        if (!gameOver) return;
        const final = game.current.score;
        const previousBest = readNumber(BEST_KEY);
        setIsNewRecord(final > 0 && final > Math.max(previousBest, myEntry >= 0 ? leaderboard[myEntry].score : 0));
        if (final > previousBest) {
            setBest(final);
            try { localStorage.setItem(BEST_KEY, String(final)); } catch { /* sin almacenamiento */ }
        }
        const token = gameTokenRef.current;
        if (final > 0 && token) {
            apiService.saveBalanceScore(final, token).then(fetchLeaderboard).catch(e => console.error('Error saving score', e));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameOver]);

    const tryDrop = useCallback(() => {
        const g = game.current;
        if (g.over || g.spawning || !dropRef.current) return;
        const drop = dropRef.current();
        if (!drop) return;
        g.spawning = true;
        setIsSpawning(true);
        const round = g.round;
        setBlocks(prev => [...prev, { id: `b${round}-${++g.seq}`, piece: nextPieceRef.current, ...drop }]);
        sfx.drop();
        window.setTimeout(() => {
            if (game.current.round !== round) return;
            game.current.spawning = false;
            setIsSpawning(false);
            setNextPiece(randomPiece(game.current.floors));
        }, DROP_COOLDOWN_MS);
    }, []);

    const restartGame = useCallback(() => {
        const g = game.current;
        game.current = { over: false, overAt: 0, spawning: false, score: 0, combo: 1, floors: 0, celebrated: false, round: g.round + 1, seq: 0 };
        // Los bloques de la partida anterior se desmontan después: que el bucle deje de verlos ya,
        // o uno que sigue cayendo terminaría la partida nueva
        bodies.current.clear();
        FX.quakeUntil = 0;
        top.current.set(0, 0, 0);
        setBlocks([]);
        setScore(0);
        setFloors(0);
        setCombo(1);
        setGameOver(false);
        setIsSpawning(false);
        setIsNewRecord(false);
        setCallout(null);
        setShowMilestone(false);
        setNextPiece(randomPiece(0));
        startGameSession();
    }, [startGameSession]);

    // Controles: clic izquierdo, toque con un dedo, espacio o intro. Al acabar, espacio o intro reconstruyen
    useEffect(() => {
        const isUi = (target: EventTarget | null) => target instanceof Element && !!target.closest('button, a, input, [data-ui]');
        const touches = new Set<number>();
        let tap: { x: number; y: number; at: number; multi: boolean } | null = null;

        const onDown = (e: PointerEvent) => {
            if (isUi(e.target)) return;
            if (e.pointerType === 'mouse') {
                if (e.button === 0) tryDrop();
                return;
            }
            touches.add(e.pointerId);
            if (touches.size === 1) tap = { x: e.clientX, y: e.clientY, at: performance.now(), multi: false };
            else if (tap) tap.multi = true; // dos dedos: se está girando la cámara
        };
        const onUp = (e: PointerEvent) => {
            if (e.pointerType === 'mouse' || !touches.delete(e.pointerId)) return;
            if (touches.size > 0 || !tap) return;
            const t = tap;
            tap = null;
            if (!t.multi && performance.now() - t.at < 450 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 15) tryDrop();
        };
        const onCancel = (e: PointerEvent) => { touches.delete(e.pointerId); tap = null; };
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space' && e.code !== 'Enter') return;
            if (isUi(e.target)) return;
            e.preventDefault();
            if (e.repeat) return;
            const g = game.current;
            if (g.over) {
                if (performance.now() - g.overAt > 1000) restartGame();
            } else {
                tryDrop();
            }
        };

        window.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
        };
    }, [tryDrop, restartGame]);

    useEffect(() => () => window.clearTimeout(calloutTimer.current), []);

    const panel = isDarkMode ? 'bg-white/10 border-white/15 text-white' : 'bg-white/70 border-white/50 text-slate-800 shadow-sm';
    const info = pieceInfo(nextPiece);

    return (
        <div
            className={`w-full h-[100dvh] relative transition-colors duration-700 overflow-hidden font-sans select-none touch-none ${
                isDarkMode ? 'bg-slate-900' : 'bg-slate-100'
            }`}
            onContextMenu={e => e.preventDefault()}
        >
            {/* Barra superior */}
            <div className="absolute top-0 left-0 w-full p-3 sm:p-6 flex gap-2 sm:gap-4 justify-between items-start z-10 pointer-events-none">
                <div className="flex gap-2 items-center pointer-events-auto">
                    <Link to="/entretenimiento" className={`flex items-center font-bold backdrop-blur-md px-3 sm:px-4 py-2 rounded-full transition-all border ${panel}`}>
                        <ChevronLeftIcon className="w-5 h-5 sm:mr-1" />
                        <span className="hidden sm:inline">Salir</span>
                    </Link>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-all border backdrop-blur-md ${panel}`} title={isDarkMode ? 'Cambiar a día' : 'Cambiar a noche'} aria-label={isDarkMode ? 'Cambiar a día' : 'Cambiar a noche'}>
                        {isDarkMode ? <SunIcon className="w-6 h-6 text-amber-300" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={toggleMute} className={`p-2 rounded-full transition-all border backdrop-blur-md ${panel}`} title={muted ? 'Activar sonido' : 'Silenciar'} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
                        {muted ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={() => setShowBoard(!showBoard)} className={`p-2 rounded-full transition-all border backdrop-blur-md ${panel} ${showBoard ? 'ring-2 ring-emerald-400/60' : ''}`} title="Ranking del mes" aria-label="Ranking del mes">
                        <TrophyIcon className="w-6 h-6 text-emerald-400" />
                    </button>
                </div>

                <div className="flex gap-2 sm:gap-3 items-stretch" data-ui>
                    <div className={`backdrop-blur-xl rounded-2xl px-3 py-2 sm:px-5 sm:py-3 text-center border hidden sm:block ${panel}`}>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Tu récord</h3>
                        <p className="text-xl sm:text-2xl font-black font-mono leading-none">{personalBest}</p>
                    </div>
                    <div className={`backdrop-blur-xl rounded-2xl px-3 py-2 sm:px-5 sm:py-3 text-center border ${panel}`}>
                        <h3 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>Plantas</h3>
                        <p className="text-xl sm:text-2xl font-black font-mono leading-none">{floors}</p>
                    </div>
                    <motion.div
                        key={score}
                        initial={{ scale: score > 0 ? 1.15 : 1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="relative bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-md rounded-2xl px-4 py-2 sm:px-6 sm:py-3 text-center shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 min-w-[84px]"
                    >
                        <h3 className="text-emerald-50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Puntos</h3>
                        <p className="text-white text-2xl sm:text-3xl font-black font-mono leading-none">{score}</p>
                        {combo > 1 && (
                            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow whitespace-nowrap">
                                COMBO x{combo}
                            </span>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Ranking del mes */}
            <AnimatePresence>
                {showBoard && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        data-ui
                        className="absolute top-20 sm:top-24 left-3 sm:left-6 z-20 w-56 sm:w-64"
                    >
                        <div className={`backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] ${isDarkMode ? 'bg-[#0f172a]/60 border-white/10' : 'bg-white/70 border-white/40'}`}>
                            <h3 className="text-emerald-400 font-black text-[10px] sm:text-xs uppercase tracking-widest mb-3 flex items-center">
                                <span className="mr-2">🏆</span> Top 10 del mes
                            </h3>
                            <div className="space-y-1.5">
                                {isLoadingLeaderboard ? (
                                    <div className="text-slate-500 text-xs italic">Cargando...</div>
                                ) : leaderboard.length === 0 ? (
                                    <div className="text-slate-500 text-xs italic">Sé el primero en jugar este mes</div>
                                ) : (
                                    leaderboard.map((lb, idx) => {
                                        const mine = lb.user_id === user.id;
                                        return (
                                            <div key={lb.id} className={`flex justify-between items-center text-xs sm:text-sm rounded-lg px-1.5 py-0.5 ${mine ? 'bg-emerald-500/20' : ''}`}>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className={`font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>{idx + 1}.</span>
                                                    <span className={`truncate font-semibold w-24 sm:w-32 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} title={lb.user_name}>
                                                        {mine ? 'Tú' : lb.user_name}
                                                    </span>
                                                </div>
                                                <span className={`font-bold tabular-nums pl-1 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{lb.score}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Siguiente pieza especial */}
            <AnimatePresence>
                {info && !gameOver && (
                    <motion.div
                        key={`${nextPiece.kind}-${nextPiece.shape}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                    >
                        <div className={`flex items-center gap-3 backdrop-blur-xl rounded-full pl-2 pr-4 py-2 border whitespace-nowrap ${panel}`}>
                            <span className="w-7 h-7 rounded-lg border border-black/20" style={{ background: nextPiece.kind === 'logo' ? 'linear-gradient(135deg,#fff 55%,#10b981 55%)' : nextPiece.color, borderRadius: nextPiece.shape === 'tower' ? '9999px' : undefined }} />
                            <span className="text-sm"><b>{info.label}</b> · {info.tip}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Aviso de viento: a partir de la planta 10 la torre se mece */}
            {floors >= 10 && !gameOver && (
                <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border whitespace-nowrap ${panel}`}>
                    🌬️ Hay viento: la torre se mece
                </div>
            )}

            {/* Puntos al encajar */}
            <AnimatePresence>
                {callout && (
                    <motion.div
                        key={callout.key}
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1.1, y: -10 }}
                        exit={{ opacity: 0, scale: 0.8, y: -40 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className={`absolute top-[36%] left-1/2 -translate-x-1/2 z-20 pointer-events-none font-black text-4xl sm:text-5xl md:text-6xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] whitespace-nowrap ${
                            callout.tone === 'perfect' ? 'text-amber-400' : callout.tone === 'logo' || callout.tone === 'milestone' ? 'text-white' : callout.tone === 'alert' ? 'text-red-500' : 'text-emerald-400'
                        }`}
                    >
                        {callout.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instrucciones al empezar */}
            {blocks.length === 0 && !gameOver && (
                <div className="absolute top-[22%] left-1/2 -translate-x-1/2 text-center z-10 pointer-events-none w-[92%] md:w-auto">
                    <h2 className={`text-4xl md:text-6xl font-black drop-shadow-2xl tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>La Torre Fincas</h2>
                    <div className={`inline-block text-sm sm:text-base font-medium px-5 py-3 rounded-2xl backdrop-blur-sm border space-y-1 ${isDarkMode ? 'text-white/90 bg-black/40 border-white/10' : 'text-slate-800 bg-white/70 border-black/10'}`}>
                        <p><b>Toca</b> la pantalla (o pulsa <b>espacio</b>) para soltar la planta.</p>
                        <p>Si el punto se pone <span className="text-amber-400 font-bold">dorado</span>, encaja perfecta: suma combo.</p>
                        <p className="opacity-70 text-xs sm:text-sm">Gira la cámara con dos dedos o con el botón derecho.</p>
                    </div>
                </div>
            )}

            {/* Fin de la partida */}
            <AnimatePresence>
                {gameOver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.6 }}
                        className={`absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center z-30 ${isDarkMode ? 'bg-[#0f172a]/70' : 'bg-slate-200/70'}`}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: 'spring', bounce: 0.5, delay: 0.6 }}
                            className={`p-8 sm:p-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-[90%] text-center border relative overflow-hidden ${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200'}`}
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
                            <h2 className={`text-3xl sm:text-4xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>¡Derrumbe!</h2>
                            <p className={`font-medium mb-6 text-sm sm:text-base ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                                {floors === 0 ? 'La primera planta se fue al suelo.' : `Tu edificio de ${floors} ${floors === 1 ? 'planta' : 'plantas'} se ha venido abajo.`}
                            </p>
                            <div className={`rounded-2xl p-6 mb-6 border ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <span className={`block text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>Puntuación final</span>
                                <span className="text-6xl font-black text-emerald-400">{score}</span>
                                {isNewRecord && <p className="text-amber-400 font-bold text-sm mt-3 animate-pulse">¡Nuevo récord personal!</p>}
                                {!isNewRecord && personalBest > 0 && <p className={`text-xs mt-3 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Tu récord: {personalBest}</p>}
                                {myEntry >= 0 && <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Vas {myEntry + 1}º en el ranking del mes</p>}
                            </div>
                            <button
                                onClick={restartGame}
                                className="w-full bg-emerald-500 text-white font-black text-lg py-4 rounded-xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all outline-none border border-emerald-400/50"
                            >
                                Reconstruir
                            </button>
                            <p className={`text-xs mt-3 hidden sm:block ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>o pulsa espacio</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Celebración de los 100 puntos */}
            <AnimatePresence>
                {showMilestone && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.5, 1.2] }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="absolute w-[600px] h-[600px] bg-emerald-400/25 rounded-full blur-[100px]"
                        />
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="relative text-center">
                            <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter drop-shadow-2xl">¡100 PUNTOS!</h1>
                            <p className="text-emerald-400 font-black text-xl md:text-2xl mt-4 uppercase tracking-[0.3em] drop-shadow-lg">Edificio legendario</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Motor 3D */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 50 }}>
                <Lighting isDarkMode={isDarkMode} />
                <fog attach="fog" args={[isDarkMode ? '#0f172a' : '#e2e8f0', 35, 90]} />
                <LocalEnvironment isDarkMode={isDarkMode} />
                <CityBackdrop isDarkMode={isDarkMode} />

                <Physics gravity={[0, -9.81, 0]} numSolverIterations={8}>
                    <BasePlatform isDarkMode={isDarkMode} />
                    {blocks.map(block => <BuildingBlock key={block.id} block={block} bodies={bodies} />)}
                    <TowerTracker bodies={bodies} top={top} handlers={handlers} />
                    {!gameOver && <ConstructionDrone floors={floors} isSpawning={isSpawning} piece={nextPiece} top={top} dropRef={dropRef} />}
                </Physics>

                <CameraRig top={top} />
                <ImpactRings />
                <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={20} blur={2.0} far={10} color="#000000" />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
                    <circleGeometry args={[70, 64]} />
                    <meshStandardMaterial color={isDarkMode ? '#020617' : '#e2e8f0'} roughness={0.8} metalness={0.1} />
                </mesh>
            </Canvas>
        </div>
    );
}

export default function UbicaBalance() {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
            </div>
        );
    }
    return user ? <TowerGame user={user} /> : <LoginGate />;
}
