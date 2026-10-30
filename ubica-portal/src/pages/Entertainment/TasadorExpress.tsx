import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeftIcon, ChevronRightIcon, CalculatorIcon, MapPinIcon, HomeIcon, ArrowsPointingOutIcon,
    ClockIcon, ShareIcon, TrophyIcon, BuildingLibraryIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, type TasadorDaily, type TasadorRankingEntry, type TasadorReveal, type TasadorRound } from '../../services/apiService';

// Reto diario: las mismas 5 tasaciones para todos durante el día. El servidor guarda las respuestas de quien
// tiene cuenta (ranking del mes); sin cuenta se recuerdan en este navegador.

type Answers = Record<number, TasadorReveal>;

const SHARE_URL = 'https://ubica.amifincas.es/entretenimiento/tasador';
const euros = (n: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n);
const withUnit = (n: number, unit: string) => (unit === '€' ? `${euros(n)} €` : `${euros(n)} €/m²`);

// Escala logarítmica: el mismo gesto mueve lo mismo en un piso de 80.000 € que en una villa de 900.000 €
const RANGES: Record<string, [number, number, number]> = { '€': [20_000, 2_000_000, 150_000], '€/m²': [400, 7_000, 1_500] };
const STEPS = 1000;
const toPos = (v: number, [min, max]: [number, number, number]) => Math.round((Math.log(v / min) / Math.log(max / min)) * STEPS);
const fromPos = (p: number, [min, max]: [number, number, number]) => min * Math.pow(max / min, p / STEPS);
const roundNice = (v: number, unit: string) => {
    const step = unit === '€' ? (v < 100_000 ? 1_000 : 5_000) : 10;
    return Math.round(v / step) * step;
};

const square = (pts: number) => (pts >= 90 ? '🟩' : pts >= 60 ? '🟨' : pts >= 30 ? '🟧' : '🟥');
const verdict = (pts: number) =>
    pts >= 90 ? '¡Ojo de tasador!' : pts >= 60 ? 'Muy cerca' : pts >= 30 ? 'Te has desviado un poco' : 'Lejos del precio real';

function storageKey(day: string) {
    return `tasador-${day}`;
}
function loadLocal(day: string): Answers {
    try {
        return JSON.parse(localStorage.getItem(storageKey(day)) || '{}');
    } catch {
        return {};
    }
}
function saveLocal(day: string, answers: Answers) {
    try {
        localStorage.setItem(storageKey(day), JSON.stringify(answers));
    } catch { /* modo privado: la partida sigue, solo no se recuerda */ }
}

function countdown(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} h ${String(m).padStart(2, '0')} min`;
}

export default function TasadorExpress() {
    const { user } = useAuth();
    const [daily, setDaily] = useState<TasadorDaily | null>(null);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState<Answers>({});
    const [current, setCurrent] = useState<number | null>(null); // ronda abierta; null = portada o resumen
    const [sending, setSending] = useState(false);
    const [ranking, setRanking] = useState<TasadorRankingEntry[] | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        apiService.getTasadorDaily()
            .then(d => {
                setDaily(d);
                setSecondsLeft(d.segundos_para_el_siguiente);
                const fromServer: Answers = Object.fromEntries(d.respondidas.map(({ round, ...r }) => [round, r]));
                // Con cuenta manda el servidor; lo jugado como invitado en este navegador no cuenta para el ranking
                setAnswers(user ? fromServer : loadLocal(d.day));
            })
            .catch(() => setError('No se ha podido cargar el reto de hoy. Revisa tu conexión e inténtalo de nuevo.'));
    }, [user]);

    useEffect(() => {
        const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 60)), 60_000);
        return () => clearInterval(id);
    }, []);

    const done = daily ? daily.rondas.every((_, i) => answers[i]) : false;
    const total = useMemo(() => Object.values(answers).reduce((sum, a) => sum + a.puntos, 0), [answers]);

    useEffect(() => {
        if (done) apiService.getTasadorRanking().then(setRanking).catch(() => setRanking([]));
    }, [done]);

    const submit = useCallback(async (guess: number) => {
        if (!daily || current === null || sending) return;
        setSending(true);
        try {
            const result = await apiService.sendTasadorGuess(daily.day, current, guess);
            setAnswers(prev => {
                const next = { ...prev, [current]: result };
                if (!user) saveLocal(daily.day, next);
                return next;
            });
        } catch (e: any) {
            setError(e?.status === 409 ? 'El reto de ayer ha terminado. Recarga la página para jugar el de hoy.' : 'No se ha podido enviar tu respuesta. Inténtalo de nuevo.');
        } finally {
            setSending(false);
        }
    }, [daily, current, sending, user]);

    const firstPending = daily ? daily.rondas.findIndex((_, i) => !answers[i]) : -1;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="page-container h-14 flex items-center justify-between gap-2">
                    <Link to="/entretenimiento" className="flex items-center text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors font-medium text-sm">
                        <ChevronLeftIcon className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline">Volver a Ubica Play</span>
                        <span className="sm:hidden">Ubica Play</span>
                    </Link>
                    <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <CalculatorIcon className="w-6 h-6" />
                        Tasador Exprés{daily ? <span className="font-semibold text-gray-400"> #{daily.numero}</span> : null}
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                        {total} / 500
                    </span>
                </div>
            </div>

            <div className="page-container mt-6 sm:mt-8">
                {error && (
                    <div role="alert" className="max-w-2xl mx-auto mb-6 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {!daily && !error && (
                    <div className="max-w-2xl mx-auto text-center py-24 text-gray-500 dark:text-gray-400">
                        <CalculatorIcon className="w-14 h-14 mx-auto mb-4 text-emerald-500 animate-pulse" />
                        Preparando el reto de hoy…
                    </div>
                )}

                {daily && (
                    <>
                        <Progress rounds={daily.rondas} answers={answers} current={current} onPick={i => setCurrent(i)} />

                        <AnimatePresence mode="wait">
                            {current === null && !done && (
                                <Intro key="intro" daily={daily} started={firstPending > 0} loggedIn={!!user} onStart={() => setCurrent(firstPending)} />
                            )}
                            {current !== null && (
                                <RoundView
                                    key={`round-${current}`}
                                    index={current}
                                    round={daily.rondas[current]}
                                    answer={answers[current]}
                                    sending={sending}
                                    onSubmit={submit}
                                    onNext={() => {
                                        const next = daily.rondas.findIndex((_, i) => !answers[i]);
                                        setCurrent(next === -1 ? null : next);
                                    }}
                                    isLast={daily.rondas.every((_, i) => i === current || answers[i])}
                                />
                            )}
                            {current === null && done && (
                                <Summary key="summary" daily={daily} answers={answers} total={total} ranking={ranking}
                                         loggedIn={!!user} secondsLeft={secondsLeft} onReview={i => setCurrent(i)} />
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
}

function Progress({ rounds, answers, current, onPick }: { rounds: TasadorRound[]; answers: Answers; current: number | null; onPick: (i: number) => void }) {
    return (
        <div className="flex justify-center gap-2 mb-6" aria-label="Rondas del reto">
            {rounds.map((_, i) => {
                const a = answers[i];
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!a}
                        onClick={() => onPick(i)}
                        aria-label={a ? `Ronda ${i + 1}: ${a.puntos} puntos` : `Ronda ${i + 1}: pendiente`}
                        className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-colors ${current === i ? 'border-emerald-500' : 'border-transparent'} ${a ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                    >
                        {a ? square(a.puntos) : i + 1}
                    </button>
                );
            })}
        </div>
    );
}

function Intro({ daily, started, loggedIn, onStart }: { daily: TasadorDaily; started: boolean; loggedIn: boolean; onStart: () => void }) {
    const date = new Date(`${daily.day}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto overflow-hidden">
            <div className="bg-emerald-600 px-8 py-8 text-white text-center">
                <p className="uppercase tracking-widest text-xs font-semibold text-emerald-100">Reto diario · {date}</p>
                <h1 className="text-3xl sm:text-4xl font-black mt-2">¿Tienes ojo de tasador?</h1>
            </div>
            <div className="p-6 sm:p-8 space-y-5 text-gray-700 dark:text-gray-300">
                <p>Cada día, las mismas <strong>5 tasaciones</strong> para todo el mundo: inmuebles de Ubica y el precio del m² de vivienda en municipios de España, con datos oficiales.</p>
                <ul className="space-y-2 text-sm">
                    <li className="flex gap-2"><CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" /> Mueve el control o escribe tu precio.</li>
                    <li className="flex gap-2"><CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" /> 100 puntos si lo clavas; pierdes 2 por cada 1 % de diferencia.</li>
                    <li className="flex gap-2"><CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" /> Una respuesta por ronda. Mañana, reto nuevo.</li>
                </ul>
                <button onClick={onStart}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-colors">
                    {started ? 'Continuar el reto' : 'Empezar el reto'}
                </button>
                {!loggedIn && (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                        Juegas como invitado. <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Crea una cuenta gratis</Link> para entrar en el ranking del mes.
                    </p>
                )}
            </div>
        </motion.div>
    );
}

function Photos({ fotos: all, alt }: { fotos: string[]; alt: string }) {
    const [i, setI] = useState(0);
    // Las que no cargan se quitan y se pasa a la siguiente
    const [broken, setBroken] = useState<string[]>([]);
    const fotos = all.filter(f => !broken.includes(f));
    if (!fotos.length) {
        return <div className="h-64 md:h-80 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><HomeIcon className="w-16 h-16 text-gray-400" /></div>;
    }
    const shown = fotos[Math.min(i, fotos.length - 1)];
    return (
        <div className="relative h-64 md:h-80 bg-gray-200 dark:bg-gray-700">
            <img src={shown} alt={alt} className="w-full h-full object-cover" onError={() => setBroken(b => [...b, shown])} />
            {fotos.length > 1 && (
                <>
                    <button type="button" aria-label="Foto anterior" onClick={() => setI((i - 1 + fotos.length) % fotos.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <button type="button" aria-label="Foto siguiente" onClick={() => setI((i + 1) % fotos.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"><ChevronRightIcon className="w-5 h-5" /></button>
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg">{Math.min(i, fotos.length - 1) + 1}/{fotos.length}</span>
                </>
            )}
        </div>
    );
}

function RoundView({ index, round, answer, sending, onSubmit, onNext, isLast }: {
    index: number; round: TasadorRound; answer?: TasadorReveal; sending: boolean;
    onSubmit: (guess: number) => void; onNext: () => void; isLast: boolean;
}) {
    const range = RANGES[round.unidad];
    const [value, setValue] = useState(range[2]);
    const [text, setText] = useState(euros(range[2]));

    const setFromNumber = (v: number) => {
        const clamped = Math.min(range[1], Math.max(range[0], v));
        setValue(clamped);
        setText(euros(clamped));
    };

    return (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto overflow-hidden">
            {round.tipo === 'inmueble' ? (
                <Photos fotos={round.fotos || []} alt={round.titulo || 'Inmueble'} />
            ) : (
                <div className="h-40 sm:h-48 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex flex-col items-center justify-center text-center px-6">
                    <MapPinIcon className="w-10 h-10 mb-2 text-emerald-200" />
                    <p className="text-3xl sm:text-4xl font-black">{round.municipio}</p>
                    <p className="text-emerald-100 mt-1">{round.provincia}</p>
                </div>
            )}

            <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ronda {index + 1} de 5</p>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{round.pregunta}</h2>

                {round.tipo === 'inmueble' ? (
                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-gray-600 dark:text-gray-300 text-sm">
                        <span className="font-semibold">{round.tipo_inmueble} en venta</span>
                        {round.ciudad && <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" />{round.ciudad}</span>}
                        {!!round.habitaciones && <span className="flex items-center gap-1"><HomeIcon className="w-4 h-4" />{round.habitaciones} hab. · {round.banos ?? 0} baños</span>}
                        {!!round.superficie_m2 && <span className="flex items-center gap-1"><ArrowsPointingOutIcon className="w-4 h-4" />{euros(round.superficie_m2)} m²</span>}
                    </div>
                ) : (
                    <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">Valor tasado medio de la vivienda libre por metro cuadrado.</p>
                )}

                {!answer ? (
                    <form className="mt-8" onSubmit={e => { e.preventDefault(); onSubmit(roundNice(value, round.unidad)); }}>
                        <label htmlFor={`guess-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tu tasación</label>
                        <div className="flex items-center gap-2">
                            <input
                                id={`guess-${index}`}
                                inputMode="numeric"
                                value={text}
                                onChange={e => {
                                    setText(e.target.value);
                                    const n = Number(e.target.value.replace(/\D/g, ''));
                                    if (n >= range[0] && n <= range[1]) setValue(n);
                                }}
                                onBlur={() => setFromNumber(Number(text.replace(/\D/g, '')) || range[2])}
                                className="w-full text-3xl font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-xl font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{round.unidad}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={STEPS}
                            value={toPos(value, range)}
                            onChange={e => setFromNumber(roundNice(fromPos(Number(e.target.value), range), round.unidad))}
                            aria-label="Ajustar la tasación"
                            className="w-full mt-5 accent-emerald-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{withUnit(range[0], round.unidad)}</span>
                            <span>{withUnit(range[1], round.unidad)}</span>
                        </div>
                        <button type="submit" disabled={sending}
                                className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-lg py-4 rounded-xl transition-colors">
                            {sending ? 'Comprobando…' : 'Tasar'}
                        </button>
                    </form>
                ) : (
                    <RevealCard round={round} answer={answer} onNext={onNext} isLast={isLast} />
                )}
            </div>
        </motion.div>
    );
}

function RevealCard({ round, answer, onNext, isLast }: { round: TasadorRound; answer: TasadorReveal; onNext: () => void; isLast: boolean }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Tu tasación</p>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">{withUnit(answer.respuesta, round.unidad)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold">{round.tipo === 'inmueble' ? 'Precio real' : 'Valor oficial'}</p>
                    <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{withUnit(answer.real, round.unidad)}</p>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-lg font-black text-gray-900 dark:text-white">{square(answer.puntos)} {verdict(answer.puntos)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Te has desviado un {answer.error_porcentaje.toLocaleString('es-ES')} % · <strong>+{answer.puntos} puntos</strong></p>
            </div>
            {round.tipo === 'inmueble' && answer.url && (
                <Link to={answer.url} className="mt-3 inline-block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Ver el anuncio →</Link>
            )}
            {round.tipo === 'municipio' && round.fuente && (
                <p className="mt-3 text-xs text-gray-400 flex items-start gap-1"><BuildingLibraryIcon className="w-4 h-4 shrink-0" />Fuente: {round.fuente}.</p>
            )}
            <button onClick={onNext}
                    className="mt-6 w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                {isLast ? 'Ver mi resultado' : 'Siguiente ronda'}
            </button>
        </motion.div>
    );
}

function Summary({ daily, answers, total, ranking, loggedIn, secondsLeft, onReview }: {
    daily: TasadorDaily; answers: Answers; total: number; ranking: TasadorRankingEntry[] | null;
    loggedIn: boolean; secondsLeft: number; onReview: (i: number) => void;
}) {
    const [copied, setCopied] = useState(false);
    const squares = daily.rondas.map((_, i) => square(answers[i]?.puntos ?? 0)).join('');
    const shareText = `Ubica Play · Tasador Exprés #${daily.numero}\n${squares} ${total}/500\n${SHARE_URL}`;

    const share = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: shareText });
                return;
            } catch { /* cancelado: probamos a copiar */ }
        }
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch { /* sin portapapeles: queda el botón de WhatsApp */ }
    };

    return (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center">
                <p className="uppercase tracking-widest text-xs font-semibold text-gray-500 dark:text-gray-400">Reto #{daily.numero} completado</p>
                <p className="text-6xl font-black text-emerald-600 dark:text-emerald-400 mt-3">{total}<span className="text-2xl text-gray-400"> / 500</span></p>
                <p className="text-3xl mt-3 tracking-widest" aria-hidden="true">{squares}</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={share} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
                        <ShareIcon className="w-5 h-5" />{copied ? '¡Copiado!' : 'Compartir resultado'}
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-95 text-white font-bold py-3 rounded-xl transition">
                        Enviar por WhatsApp
                    </a>
                </div>
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                    <ClockIcon className="w-4 h-4" /> Siguiente reto en {countdown(secondsLeft)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    {daily.rondas.map((r, i) => (
                        <button key={i} onClick={() => onReview(i)} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                            {square(answers[i]?.puntos ?? 0)} {r.tipo === 'inmueble' ? r.tipo_inmueble : r.municipio}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><TrophyIcon className="w-5 h-5 text-amber-500" /> Ranking del mes</h3>
                {ranking === null ? (
                    <p className="text-sm text-gray-500 mt-4">Cargando…</p>
                ) : ranking.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Todavía nadie con cuenta ha jugado este mes. ¡Puedes ser el primero!</p>
                ) : (
                    <ol className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                        {ranking.map(r => (
                            <li key={r.posicion} className="flex items-center justify-between py-2 text-sm">
                                <span className="text-gray-700 dark:text-gray-200"><span className="inline-block w-6 font-bold text-gray-400">{r.posicion}</span>{r.nombre}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{euros(r.puntos)} <span className="text-xs font-normal text-gray-400">pts · {r.retos} {r.retos === 1 ? 'reto' : 'retos'}</span></span>
                            </li>
                        ))}
                    </ol>
                )}
                {!loggedIn && (
                    <div className="mt-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                        Hoy has jugado como invitado y tus puntos no cuentan. <Link to="/register" className="font-bold underline">Crea una cuenta gratis</Link> y suma los de los próximos retos.
                    </div>
                )}
            </div>

            <div className="text-center">
                <Link to="/" className="inline-block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    ¿Buscas casa de verdad? Mira los inmuebles de Ubica →
                </Link>
            </div>
        </motion.div>
    );
}
