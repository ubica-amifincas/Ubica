import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import qrcode from 'qrcode-generator';
import {
    ArrowsPointingInIcon, ArrowsPointingOutIcon, BuildingOffice2Icon, CheckCircleIcon, ClockIcon, HomeIcon, MapPinIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';
import { AMI, UBICA } from '../seo/content.js';
import { UBICA_ORIGIN, propertyPath } from '../seo/pages';
import { getTypeLabel, normalizeType } from '../utils/propertyStatus';
import { WhatsAppIcon } from '../components/layout/Footer';

/**
 * Escaparate digital: la pantalla del cristal de la oficina de AMI Fincas, de cara a la calle.
 * Pasa una a una las viviendas publicadas, con su QR a la ficha, y la marca y el contacto siempre a la vista.
 * Sin viviendas, pasa diapositivas de AMI Fincas. Está pensada para quedarse abierta días: recarga la lista cada
 * pocos minutos, la página una vez al día, y si se cae la red sigue con lo último que cargó.
 *
 * Opciones por la URL:
 *   ?segundos=12             tiempo de cada diapositiva (5-120)
 *   ?operacion=venta|alquiler solo esas viviendas
 *   ?orientacion=vertical|horizontal  fuerza el diseño (por defecto, según la pantalla)
 *   ?girar=90|270            gira la imagen, para televisores colgados en vertical que no saben girarla
 */

const PAGE_SIZE = 100; // máximo de la API por petición
const REFRESH_MS = 5 * 60_000;
const RELOAD_HOUR = 5; // recarga diaria, con la oficina cerrada
const RELOAD_RETRY_MS = 10 * 60_000;
const AMI_EVERY = 6; // con viviendas, una diapositiva de AMI Fincas cada tantas
const IDLE_MS = 4000;
const CACHE_KEY = 'escaparate-viviendas';

const TEAL = '#23707f';
const MINT = '#8fd0c3';
const WHATSAPP_URL = `https://wa.me/34${AMI.whatsapp.replace(/\s/g, '')}`;

interface Options {
    seconds: number;
    operation: 'for-sale' | 'for-rent' | null;
    orientation: 'auto' | 'horizontal' | 'vertical';
    rotate: 0 | 90 | 270;
}

function readOptions(search: string): Options {
    const q = new URLSearchParams(search);
    const seconds = Number(q.get('segundos'));
    const op = q.get('operacion');
    const orientation = q.get('orientacion');
    const rotate = Number(q.get('girar'));
    return {
        seconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(120, Math.max(5, seconds)) : 12,
        operation: op === 'venta' ? 'for-sale' : op === 'alquiler' ? 'for-rent' : null,
        orientation: orientation === 'vertical' || orientation === 'horizontal' ? orientation : 'auto',
        rotate: rotate === 90 || rotate === 270 ? rotate : 0,
    };
}

// ─── Datos ──────────────────────────────────────────────────────────────────

/** Lo que el escaparate necesita de cada vivienda (también es lo que se guarda para cuando no hay red). */
interface Listing {
    id: number; title: string; price: number; status: string; type: string;
    city: string; region: string; bedrooms: number; bathrooms: number; area: number; image: string | null;
}

function toListing(p: any): Listing {
    const images = Array.isArray(p.images) ? p.images : [];
    return {
        id: p.id, title: p.title || '', price: Number(p.price) || 0, status: p.status, type: p.type || '',
        city: p.city || '', region: p.region || '',
        bedrooms: Number(p.bedrooms) || 0, bathrooms: Number(p.bathrooms) || 0, area: Number(p.area) || 0,
        image: images.find((src: unknown) => typeof src === 'string' && src.trim()) ?? null,
    };
}

/** Todas las viviendas publicadas, por páginas de 100 (la API no da más por petición). */
async function fetchListings(): Promise<Listing[]> {
    const all: Listing[] = [];
    for (let skip = 0; skip < 2000; skip += PAGE_SIZE) {
        const controller = new AbortController();
        // El backend de Render puede tardar casi un minuto en despertar
        const timer = setTimeout(() => controller.abort(), 60_000);
        try {
            const res = await fetch(`${API_BASE_URL}/properties?skip=${skip}&limit=${PAGE_SIZE}`, { cache: 'no-store', signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const page = await res.json();
            all.push(...page.map(toListing));
            if (page.length < PAGE_SIZE) break;
        } finally {
            clearTimeout(timer);
        }
    }
    return all;
}

interface Cached { at: number; items: Listing[] }

function loadCache(): Cached | null {
    try {
        const data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        return data && Array.isArray(data.items) ? data : null;
    } catch {
        return null;
    }
}
function saveCache(data: Cached) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch { /* sin almacenamiento: solo se pierde el respaldo sin red */ }
}

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const hourMinute = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const zoneOf = (l: Listing) => (l.city && l.region && l.city !== l.region ? `${l.city} (${l.region})` : l.city || l.region);
const ficha = (l: Listing) => `${UBICA_ORIGIN}${propertyPath(l)}`;

// ─── Diapositivas ───────────────────────────────────────────────────────────

type AmiPage = 'services' | 'offices' | 'ubica' | 'rentals';
const AMI_PAGES: AmiPage[] = ['services', 'offices', 'ubica', 'rentals'];

type Slide = { key: string; kind: 'listing'; listing: Listing } | { key: string; kind: 'ami'; page: AmiPage };

function buildSlides(listings: Listing[]): Slide[] {
    const ami = (page: AmiPage): Slide => ({ key: `ami-${page}`, kind: 'ami', page });
    if (!listings.length) return AMI_PAGES.map(ami);
    const slides: Slide[] = [];
    listings.forEach((listing, i) => {
        slides.push({ key: `p-${listing.id}`, kind: 'listing', listing });
        // Cada página de AMI sale una vez por vuelta como mucho (las claves no se repiten)
        const n = (i + 1) / AMI_EVERY;
        if (Number.isInteger(n) && n <= AMI_PAGES.length) slides.push(ami(AMI_PAGES[n - 1]));
    });
    // Con pocas viviendas, al menos la invitación a Ubica
    if (listings.length < AMI_EVERY) slides.push(ami('ubica'));
    return slides;
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Escaparate() {
    return (
        <ShowcaseBoundary>
            <Showcase />
        </ShowcaseBoundary>
    );
}

function Showcase() {
    const { search } = useLocation();
    const options = useMemo(() => readOptions(search), [search]);

    const [cached] = useState(loadCache);
    const [listings, setListings] = useState<Listing[]>(cached?.items ?? []);
    const [loadedAt, setLoadedAt] = useState<number | null>(cached?.at ?? null);
    const [offline, setOffline] = useState(false);
    const [currentKey, setCurrentKey] = useState<string | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
    const [idle, setIdle] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [tall, setTall] = useState(() => window.innerHeight > window.innerWidth);

    // Lista de viviendas: al abrir y cada pocos minutos; si falla, se queda la anterior
    useEffect(() => {
        let alive = true;
        const load = () => fetchListings()
            .then(items => {
                if (!alive) return;
                const at = Date.now();
                setListings(items);
                setLoadedAt(at);
                setOffline(false);
                saveCache({ at, items });
            })
            .catch(() => alive && setOffline(true));
        load();
        const id = setInterval(load, REFRESH_MS);
        return () => { alive = false; clearInterval(id); };
    }, []);

    useDailyReload();
    useWakeLock();

    const shown = useMemo(() => listings
        .filter(l => (options.operation ? l.status === options.operation : l.status === 'for-sale' || l.status === 'for-rent'))
        .sort((a, b) => b.id - a.id), [listings, options.operation]);
    const slides = useMemo(() => buildSlides(shown), [shown]);

    const index = Math.max(0, slides.findIndex(s => s.key === currentKey));
    const slide = slides[index];
    const go = useCallback((step: number) => {
        setCurrentKey(slides[(index + step + slides.length) % slides.length].key);
    }, [slides, index]);

    // Avance automático. Solo depende de la diapositiva: recargar la lista no reinicia su tiempo
    const goRef = useRef(go);
    goRef.current = go;
    useEffect(() => {
        const id = setTimeout(() => goRef.current(1), options.seconds * 1000);
        return () => clearTimeout(id);
    }, [slide.key, options.seconds]);

    // La foto de la siguiente, ya descargada cuando le toque
    useEffect(() => {
        const next = slides[(index + 1) % slides.length];
        if (next.kind === 'listing' && next.listing.image) new Image().src = next.listing.image;
    }, [slides, index]);

    // Orientación de la pantalla, por si el televisor o la ventana cambian
    useEffect(() => {
        const onResize = () => setTall(window.innerHeight > window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Ratón y teclado: el botón de pantalla completa y el cursor se esconden solos
    useEffect(() => {
        let timer = setTimeout(() => setIdle(true), IDLE_MS);
        const wake = () => {
            setIdle(false);
            clearTimeout(timer);
            timer = setTimeout(() => setIdle(true), IDLE_MS);
        };
        const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
        window.addEventListener('pointermove', wake);
        window.addEventListener('pointerdown', wake);
        document.addEventListener('fullscreenchange', onFullscreen);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointermove', wake);
            window.removeEventListener('pointerdown', wake);
            document.removeEventListener('fullscreenchange', onFullscreen);
        };
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen?.().catch(() => {});
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, toggleFullscreen]);

    const markBroken = useCallback((src: string) => setBrokenImages(prev => new Set(prev).add(src)), []);

    const rotated = options.rotate !== 0;
    const portrait = rotated ? options.orientation !== 'horizontal' : options.orientation === 'auto' ? tall : options.orientation === 'vertical';
    // Girado, el escenario mide lo que la pantalla al revés y se coloca con la esquina en su sitio
    const stageStyle: React.CSSProperties = rotated
        ? {
            position: 'absolute', width: '100vh', height: '100vw', transformOrigin: 'top left',
            transform: `rotate(${options.rotate}deg)`, top: options.rotate === 90 ? 0 : '100vh', left: options.rotate === 90 ? '100vw' : 0,
        }
        : { position: 'absolute', inset: 0 };

    return (
        <div className={`fixed inset-0 overflow-hidden bg-[#0d2a30] font-sans text-slate-900 ${idle ? 'cursor-none' : ''}`}>
            <div style={stageStyle} className="flex flex-col">
                <div className="relative flex-1 overflow-hidden">
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={slide.key}
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.9, ease: 'easeInOut' }}
                        >
                            {slide.kind === 'listing'
                                ? <ListingSlide listing={slide.listing} portrait={portrait} seconds={options.seconds}
                                    broken={!!slide.listing.image && brokenImages.has(slide.listing.image)} onBroken={markBroken} />
                                : <AmiSlide page={slide.page} portrait={portrait} />}
                        </motion.div>
                    </AnimatePresence>

                    {/* Tiempo que le queda a la diapositiva */}
                    <motion.div
                        key={`bar-${slide.key}`}
                        className="absolute bottom-0 left-0 h-[0.6vmin] w-full origin-left"
                        style={{ backgroundColor: MINT }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: options.seconds, ease: 'linear' }}
                    />

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        title={fullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
                        className={`absolute right-[1.5vmin] top-[1.5vmin] z-10 rounded-full bg-black/40 p-[1vmin] text-white backdrop-blur transition-opacity duration-500 hover:bg-black/60 ${idle ? 'pointer-events-none opacity-0' : 'opacity-70'}`}
                    >
                        {fullscreen ? <ArrowsPointingInIcon className="h-[3vmin] w-[3vmin]" /> : <ArrowsPointingOutIcon className="h-[3vmin] w-[3vmin]" />}
                    </button>
                </div>

                <BrandBar
                    portrait={portrait}
                    counter={slide.kind === 'listing' ? `${shown.indexOf(slide.listing) + 1} / ${shown.length}` : null}
                    offlineSince={offline && loadedAt ? loadedAt : null}
                />
            </div>
        </div>
    );
}

// ─── Vivienda ───────────────────────────────────────────────────────────────

function ListingSlide({ listing, portrait, seconds, broken, onBroken }: {
    listing: Listing; portrait: boolean; seconds: number; broken: boolean; onBroken: (src: string) => void;
}) {
    const rent = listing.status === 'for-rent';
    const land = normalizeType(listing.type) === 'land';
    const typeLabel = getTypeLabel(listing.type) || 'Inmueble';
    const zone = zoneOf(listing);
    const facts = [
        !land && listing.bedrooms > 0 && { value: listing.bedrooms, label: listing.bedrooms === 1 ? 'habitación' : 'habitaciones' },
        !land && listing.bathrooms > 0 && { value: listing.bathrooms, label: listing.bathrooms === 1 ? 'baño' : 'baños' },
        listing.area > 0 && { value: new Intl.NumberFormat('es-ES').format(listing.area), label: 'm²' },
    ].filter(Boolean) as { value: number | string; label: string }[];

    return (
        <div className={`flex h-full w-full bg-white ${portrait ? 'flex-col' : 'flex-row'}`}>
            <div className={`relative shrink-0 overflow-hidden bg-[#0d2a30] ${portrait ? 'h-[50%] w-full' : 'h-full w-[60%]'}`}>
                {listing.image && !broken ? (
                    <motion.img
                        src={listing.image}
                        alt=""
                        onError={() => onBroken(listing.image!)}
                        className="absolute inset-0 h-full w-full object-cover"
                        initial={{ scale: 1 }}
                        animate={{ scale: 1.08 }}
                        transition={{ duration: seconds + 1, ease: 'linear' }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${TEAL}, #0d2a30)` }}>
                        <HomeIcon className="h-[30%] w-[30%] text-white/25" />
                    </div>
                )}
                <span
                    className="absolute left-[3vmin] top-[3vmin] rounded-full px-[3vmin] py-[1.2vmin] text-[3.6vmin] font-extrabold uppercase tracking-wide text-white shadow-lg"
                    style={{ backgroundColor: rent ? '#b45309' : TEAL }}
                >
                    {rent ? 'En alquiler' : 'En venta'}
                </span>
            </div>

            <div className={`flex min-h-0 flex-1 flex-col justify-between ${portrait ? 'gap-[2.5vmin] px-[5vmin] py-[4vmin]' : 'gap-[3vmin] p-[4.5vmin]'}`}>
                <div className="min-h-0">
                    <p className="flex items-center gap-[1vmin] text-[3.2vmin] font-semibold" style={{ color: TEAL }}>
                        <MapPinIcon className="h-[3.4vmin] w-[3.4vmin] shrink-0" />
                        <span className="truncate">{typeLabel}{zone ? ` en ${zone}` : ''}</span>
                    </p>
                    <p className="mt-[1.5vmin] font-display text-[10vmin] font-extrabold leading-none tracking-tight text-slate-900">
                        {euros(listing.price)}{rent && <span className="text-[5vmin] font-bold text-slate-500">/mes</span>}
                    </p>
                    <h1 className="mt-[2vmin] line-clamp-2 text-[3.6vmin] font-semibold leading-tight text-slate-700">{listing.title}</h1>
                    {facts.length > 0 && (
                        <div className="mt-[3vmin] flex flex-wrap gap-x-[4vmin] gap-y-[1.5vmin]">
                            {facts.map(f => (
                                <div key={f.label} className="flex items-baseline gap-[1vmin]">
                                    <span className="font-display text-[6.5vmin] font-extrabold leading-none text-slate-900">{f.value}</span>
                                    <span className="text-[2.8vmin] font-medium text-slate-500">{f.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-[3vmin] rounded-[2.5vmin] p-[2vmin]" style={{ backgroundColor: '#e9f6f3' }}>
                    <QrCode value={ficha(listing)} className="h-[24vmin] w-[24vmin] shrink-0 rounded-[1.2vmin] bg-white p-[1vmin] text-slate-900" label="Código QR de la ficha de esta vivienda" />
                    <div>
                        <p className="text-[3.4vmin] font-bold leading-tight text-slate-900">Escanea y mira todas las fotos</p>
                        <p className="mt-[1vmin] text-[2.5vmin] leading-snug text-slate-600">Detalles, mapa y contacto en Ubica, el portal de AMI Fincas</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── AMI Fincas ─────────────────────────────────────────────────────────────

function AmiSlide({ page, portrait }: { page: AmiPage; portrait: boolean }) {
    const heading = (kicker: string, title: string) => (
        <>
            <p className="text-[3vmin] font-black uppercase tracking-[0.25em]" style={{ color: MINT }}>{kicker}</p>
            <h1 className="mt-[1.5vmin] font-display text-[7vmin] font-extrabold leading-[1.05] text-white">{title}</h1>
        </>
    );
    const shell = 'flex h-full w-full overflow-hidden text-white';
    const background = { background: `radial-gradient(circle at 15% 20%, #2b8597 0%, ${TEAL} 35%, #0d2a30 100%)` };

    if (page === 'services') {
        return (
            <div className={`${shell} ${portrait ? 'flex-col' : 'flex-row'}`} style={background}>
                <div className={`flex flex-col justify-center ${portrait ? 'px-[6vmin] pt-[8vmin]' : 'w-[58%] px-[7vmin]'}`}>
                    {heading(`Desde ${AMI.since}`, 'Administración de fincas en Murcia y Alicante')}
                    <ul className="mt-[4vmin] space-y-[2vmin]">
                        {AMI.services.map(([name]) => (
                            <li key={name} className="flex items-center gap-[2vmin] text-[3.8vmin] font-semibold">
                                <CheckCircleIcon className="h-[4.5vmin] w-[4.5vmin] shrink-0" style={{ color: MINT }} />{name}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative flex flex-1 items-center justify-center p-[4vmin]">
                    <img src="/ami-fincas/3d_warm.webp" alt="" className="max-h-full max-w-full rounded-[3vmin] object-contain shadow-2xl" />
                </div>
            </div>
        );
    }

    if (page === 'offices') {
        return (
            <div className={`${shell} flex-col justify-center px-[6vmin] py-[5vmin]`} style={background}>
                {heading('Te atendemos en persona', 'Nuestras oficinas')}
                <div className={`mt-[4vmin] grid min-h-0 gap-[4vmin] ${portrait ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {AMI.offices.map((o, i) => (
                        <div key={o.name} className={`flex min-h-0 overflow-hidden rounded-[3vmin] bg-white text-slate-900 shadow-2xl ${portrait ? 'flex-row' : 'flex-col'}`}>
                            <img
                                src={i === 0 ? '/ami-fincas/sede-murcia.webp' : '/ami-fincas/sede-san-pedro.webp'}
                                alt=""
                                className={`object-cover ${portrait ? 'h-auto w-[40%]' : 'h-[28vmin] w-full'}`}
                            />
                            <div className="p-[3vmin]">
                                <p className="text-[3.6vmin] font-extrabold leading-tight" style={{ color: TEAL }}>{o.name}</p>
                                <p className="mt-[1.5vmin] flex gap-[1vmin] text-[2.8vmin] leading-snug"><MapPinIcon className="mt-[0.4vmin] h-[3vmin] w-[3vmin] shrink-0" />{o.address}</p>
                                <p className="mt-[1vmin] flex gap-[1vmin] text-[2.8vmin]"><ClockIcon className="mt-[0.4vmin] h-[3vmin] w-[3vmin] shrink-0" />{o.hours}</p>
                                <p className="mt-[1vmin] flex gap-[1vmin] text-[3.2vmin] font-bold"><PhoneIcon className="mt-[0.4vmin] h-[3.2vmin] w-[3.2vmin] shrink-0" />{o.phone}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Invitación a Ubica y a hablar de alquileres: texto a un lado, QR al otro
    const ubica = page === 'ubica';
    const rentals = AMI.services.find(([name]) => name.includes('alquiler'));
    return (
        <div className={`${shell} items-center gap-[6vmin] px-[7vmin] py-[6vmin] ${portrait ? 'flex-col justify-center' : 'flex-row'}`} style={background}>
            <div className={portrait ? 'w-full' : 'flex-1'}>
                {ubica
                    ? heading('Ubica · el portal de AMI Fincas', 'Encuentra tu próxima casa desde el móvil')
                    : heading('¿Tienes una vivienda en alquiler?', 'Nosotros nos ocupamos de todo')}
                <p className="mt-[3vmin] max-w-[90vmin] text-[3.4vmin] leading-snug text-white/85">
                    {ubica
                        ? 'Pisos, casas, locales y terrenos en venta y alquiler, con búsqueda en el mapa y un asistente con inteligencia artificial.'
                        : rentals?.[1] ?? AMI.summary}
                </p>
                {ubica && (
                    <p className="mt-[3vmin] flex items-center gap-[1.5vmin] text-[3vmin] font-semibold" style={{ color: MINT }}>
                        <BuildingOffice2Icon className="h-[3.6vmin] w-[3.6vmin]" />{UBICA_ORIGIN.replace('https://', '')}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 flex-col items-center rounded-[3vmin] bg-white p-[3vmin] text-slate-900 shadow-2xl">
                <QrCode value={ubica ? `${UBICA_ORIGIN}/` : WHATSAPP_URL} className="h-[34vmin] w-[34vmin]" label={ubica ? 'Código QR de Ubica' : 'Código QR de WhatsApp de AMI Fincas'} />
                <p className="mt-[2vmin] flex items-center gap-[1.2vmin] text-[3.2vmin] font-bold">
                    {ubica ? <>Escanea y busca</> : <><WhatsAppIcon className="h-[3.6vmin] w-[3.6vmin] text-[#25d366]" />Escríbenos por WhatsApp</>}
                </p>
            </div>
        </div>
    );
}

// ─── Marca y contacto (siempre a la vista) ──────────────────────────────────

function BrandBar({ portrait, counter, offlineSince }: { portrait: boolean; counter: string | null; offlineSince: number | null }) {
    const samePhone = AMI.phone === AMI.whatsapp;
    return (
        <div className={`relative flex shrink-0 items-center justify-between gap-[3vmin] text-white ${portrait ? 'h-[17vmin] px-[4vmin]' : 'h-[13vmin] px-[4vmin]'}`} style={{ backgroundColor: TEAL }}>
            <div className="flex items-center gap-[2vmin]">
                <span className="flex items-center rounded-[1.5vmin] bg-white px-[1.4vmin] py-[1vmin]">
                    <img src="/ami-fincas/logo-ami-mark.png" alt="" className="h-[6.5vmin] w-auto" />
                </span>
                <div className="leading-none">
                    <p className="font-display text-[4.6vmin] font-extrabold tracking-tight">{AMI.name}</p>
                    {!portrait && <p className="mt-[0.8vmin] text-[2.2vmin] font-medium" style={{ color: MINT }}>Administración de fincas · Venta y alquiler</p>}
                </div>
            </div>

            <div className={`flex items-center ${portrait ? 'flex-col items-end gap-[0.8vmin]' : 'gap-[4vmin]'}`}>
                <p className="flex items-center gap-[1.5vmin] font-display text-[5.4vmin] font-extrabold leading-none tracking-tight">
                    <PhoneIcon className="h-[4.6vmin] w-[4.6vmin]" style={{ color: MINT }} />{AMI.phone}
                </p>
                <p className="flex items-center gap-[1.2vmin] text-[2.6vmin] font-semibold leading-none text-white/90">
                    <WhatsAppIcon className="h-[3.2vmin] w-[3.2vmin] text-[#25d366]" />
                    {samePhone ? 'Llama o escribe por WhatsApp' : `WhatsApp ${AMI.whatsapp}`}
                </p>
            </div>

            {/* Discreto: para quien mira de cerca o mantiene la pantalla */}
            <div className="absolute bottom-[0.8vmin] right-[1.5vmin] flex items-center gap-[1.5vmin] text-[1.5vmin] font-medium text-white/60">
                {offlineSince && <span>Sin conexión · datos de las {hourMinute(offlineSince)}</span>}
                {counter && <span>{counter}</span>}
            </div>
        </div>
    );
}

// ─── QR ─────────────────────────────────────────────────────────────────────

function QrCode({ value, className, label }: { value: string; className?: string; label: string }) {
    const { size, path } = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        const n = qr.getModuleCount();
        let d = '';
        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
        }
        return { size: n, path: d };
    }, [value]);
    // Margen de 2 módulos dentro del dibujo; el fondo blanco de alrededor completa la zona tranquila
    return (
        <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} className={className} shapeRendering="crispEdges" role="img" aria-label={label}>
            <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#fff" />
            <path d={path} fill="currentColor" />
        </svg>
    );
}

// ─── Desatendida ────────────────────────────────────────────────────────────

/** Recarga la página una vez al día (de madrugada) para recoger versiones nuevas; solo si la web responde. */
function useDailyReload() {
    useEffect(() => {
        const next = new Date();
        next.setHours(RELOAD_HOUR, 0, 0, 0);
        if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
        let timer: ReturnType<typeof setTimeout>;
        const attempt = () => {
            // Con parámetro único: el service worker no puede contestar con su copia y la petición prueba la red de verdad
            fetch(`/manifest.json?escaparate=${Date.now()}`, { cache: 'no-store' })
                .then(res => {
                    if (res.ok) window.location.reload();
                    else timer = setTimeout(attempt, RELOAD_RETRY_MS);
                })
                .catch(() => { timer = setTimeout(attempt, RELOAD_RETRY_MS); });
        };
        timer = setTimeout(attempt, next.getTime() - Date.now());
        return () => clearTimeout(timer);
    }, []);
}

/** Pide que la pantalla no se apague (API Wake Lock), y lo vuelve a pedir si el sistema lo suelta. */
function useWakeLock() {
    useEffect(() => {
        if (!('wakeLock' in navigator)) return;
        let lock: WakeLockSentinel | null = null;
        let stopped = false;
        const request = async () => {
            if (stopped || (lock && !lock.released) || document.visibilityState !== 'visible') return;
            try {
                lock = await navigator.wakeLock.request('screen');
            } catch { /* sin permiso o sin soporte: la pantalla dependerá de su configuración */ }
        };
        request();
        // Al volver a la pestaña, tras un clic (algunos navegadores lo exigen) y cada minuto por si acaso
        document.addEventListener('visibilitychange', request);
        window.addEventListener('pointerdown', request);
        const id = setInterval(request, 60_000);
        return () => {
            stopped = true;
            document.removeEventListener('visibilitychange', request);
            window.removeEventListener('pointerdown', request);
            clearInterval(id);
            lock?.release().catch(() => {});
        };
    }, []);
}

/** Si algo falla al pintar, la pantalla no se queda en un error: muestra la marca y se recarga al minuto. */
class ShowcaseBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    private timer: ReturnType<typeof setTimeout> | undefined;

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch() {
        this.timer = setTimeout(() => window.location.reload(), 60_000);
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center gap-[3vmin] text-white" style={{ backgroundColor: TEAL }}>
                <span className="rounded-[2vmin] bg-white px-[3vmin] py-[2vmin]"><img src="/ami-fincas/logo-ami-mark.png" alt="" className="h-[14vmin] w-auto" /></span>
                <p className="font-display text-[7vmin] font-extrabold">{AMI.name}</p>
                <p className="text-[5vmin] font-bold">{AMI.phone}</p>
            </div>
        );
    }
}
