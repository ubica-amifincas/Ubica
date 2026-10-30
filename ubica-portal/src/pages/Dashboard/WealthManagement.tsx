import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BanknotesIcon, BuildingLibraryIcon, CalculatorIcon, HomeModernIcon, PencilSquareIcon, PlusIcon,
    TrashIcon, WalletIcon, ArrowTrendingUpIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
    apiService, type MunicipioOption, type Portfolio, type PortfolioItem, type PortfolioProperty, type PortfolioPropertyInput,
} from '../../services/apiService';
import {
    PageHeader, StatCard, StatGrid, Section, EmptyState, LoadingState, ErrorAlert, PageStack, buttonClass, iconButtonClass, formatEur,
} from '../../components/dashboard/ui';

// Mi cartera inmobiliaria: viviendas en propiedad con su valor estimado (estadística oficial de valor tasado),
// rentabilidad y flujo de caja, más otros bienes y deudas. Se guarda en el servidor: solo lo ve su dueño.

// Lo que guardaba la versión anterior en el navegador: se pasa al servidor la primera vez
const LEGACY_KEYS = { asset: 'ubica_wealth_assets', liability: 'ubica_wealth_liabilities' } as const;

const percent = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`);
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatEur(n)}`;

const METHOD_LABEL: Record<string, string> = {
    indice: 'Estimado con la evolución oficial del m² en su municipio',
    m2: 'Estimado con los m² y el valor oficial del m² en su municipio',
    manual: 'Tu valoración',
    compra: 'Precio de compra (añade municipio y fecha para estimarlo)',
};

type FormState = Record<keyof PortfolioPropertyInput, string>;
const EMPTY_FORM: FormState = {
    name: '', address: '', municipio: '', provincia: '', area_m2: '', purchase_price: '', purchase_date: '', purchase_costs: '',
    current_value_manual: '', mortgage_pending: '', mortgage_monthly: '', rent_monthly: '', community_monthly: '',
    ibi_yearly: '', insurance_yearly: '', other_yearly: '', notes: '',
};
const NUMERIC: (keyof PortfolioPropertyInput)[] = [
    'area_m2', 'purchase_price', 'purchase_costs', 'current_value_manual', 'mortgage_pending', 'mortgage_monthly',
    'rent_monthly', 'community_monthly', 'ibi_yearly', 'insurance_yearly', 'other_yearly',
];
const OPTIONAL_NUMBERS = new Set<keyof PortfolioPropertyInput>(['area_m2', 'current_value_manual']);

function toForm(p: PortfolioProperty): FormState {
    const f = { ...EMPTY_FORM };
    (Object.keys(EMPTY_FORM) as (keyof PortfolioPropertyInput)[]).forEach(k => {
        const v = p[k];
        // Los importes a 0 se muestran vacíos (es lo mismo que no rellenarlos)
        f[k] = v == null || (v === 0 && NUMERIC.includes(k)) ? '' : String(v);
    });
    return f;
}

function toInput(f: FormState): PortfolioPropertyInput {
    const out: Record<string, unknown> = {};
    (Object.keys(f) as (keyof PortfolioPropertyInput)[]).forEach(k => {
        const raw = f[k].trim();
        if (NUMERIC.includes(k)) {
            const n = raw === '' ? null : Number(raw.replace(',', '.'));
            out[k] = n == null ? (OPTIONAL_NUMBERS.has(k) ? null : 0) : n;
        } else {
            out[k] = raw === '' ? null : raw;
        }
    });
    return out as unknown as PortfolioPropertyInput;
}

function loadLegacy(): PortfolioItem[] {
    const items: PortfolioItem[] = [];
    (Object.entries(LEGACY_KEYS) as [PortfolioItem['kind'], string][]).forEach(([kind, key]) => {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(saved)) {
                saved.forEach((i: any) => {
                    const amount = Number(i?.amount);
                    if (i?.name && Number.isFinite(amount) && amount >= 0) {
                        items.push({ kind, name: String(i.name).slice(0, 120), description: i.description ? String(i.description).slice(0, 300) : null, amount });
                    }
                });
            }
        } catch { /* datos antiguos ilegibles: se ignoran */ }
    });
    return items;
}

function clearLegacy() {
    try {
        Object.values(LEGACY_KEYS).forEach(k => localStorage.removeItem(k));
    } catch { /* sin acceso al almacenamiento */ }
}

export default function WealthManagement() {
    const [data, setData] = useState<Portfolio | null>(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<PortfolioProperty | 'new' | null>(null);

    const load = useCallback(async () => {
        setError('');
        try {
            let portfolio = await apiService.getPortfolio();
            // Primera visita tras el cambio: lo apuntado en este navegador pasa a la cuenta
            const legacy = loadLegacy();
            if (legacy.length && portfolio.otros.length === 0) {
                await apiService.savePortfolioItems(legacy);
                portfolio = await apiService.getPortfolio();
            }
            if (legacy.length) clearLegacy();
            setData(portfolio);
        } catch {
            setError('No se ha podido cargar tu cartera.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (error && !data) return <ErrorAlert onRetry={load}>{error}</ErrorAlert>;
    if (!data) return <LoadingState />;

    const r = data.resumen;
    return (
        <PageStack>
            <PageHeader
                title="Mi cartera inmobiliaria"
                description="Tus viviendas, lo que valen hoy según los datos oficiales y lo que te rentan. Solo lo ves tú."
                actions={!editing && (
                    <button type="button" className={buttonClass.primary} onClick={() => setEditing('new')}>
                        <PlusIcon className="h-4 w-4" /> Añadir vivienda
                    </button>
                )}
            />

            <StatGrid>
                <StatCard label="Patrimonio neto" value={formatEur(r.patrimonio_neto)} icon={WalletIcon} tone="brand"
                          hint={`Bienes ${formatEur(r.valor_inmuebles + r.otros_bienes)} · deudas ${formatEur(r.hipotecas + r.otras_deudas)}`} />
                <StatCard label="Valor de tus viviendas" value={formatEur(r.valor_inmuebles)} icon={HomeModernIcon}
                          hint={data.viviendas.length ? `${signed(r.plusvalia)} desde la compra` : 'Añade tu primera vivienda'} />
                <StatCard label="Rentabilidad neta" value={percent(r.rentabilidad_neta)} icon={ArrowTrendingUpIcon}
                          hint={r.rentabilidad_bruta == null ? 'De las viviendas alquiladas' : `Bruta ${percent(r.rentabilidad_bruta)} · solo alquiladas`} />
                <StatCard label="Flujo de caja al mes" value={signed(r.flujo_caja_mensual)} icon={BanknotesIcon}
                          tone={r.flujo_caja_mensual < 0 ? 'warning' : 'neutral'} hint="Alquileres menos gastos y cuotas de hipoteca" />
            </StatGrid>

            {editing && (
                <PropertyForm
                    initial={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await load(); }}
                />
            )}

            {data.evolucion.length > 1 && <EvolutionChart points={data.evolucion} source={data.datos_oficiales.fuente} />}

            <Section title="Tus viviendas" description="Valor estimado, rentabilidad y lo que queda por pagar de cada una.">
                {data.viviendas.length === 0 ? (
                    <EmptyState bare icon={HomeModernIcon} title="Todavía no has añadido ninguna vivienda"
                                description="Apunta las que tienes en propiedad: calculamos lo que valen hoy con los datos oficiales del Ministerio de Vivienda y lo que te rentan."
                                action={!editing && <button type="button" className={buttonClass.primary} onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" /> Añadir vivienda</button>} />
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {data.viviendas.map(p => (
                            <PropertyCard key={p.id} p={p} onEdit={() => setEditing(p)} onDeleted={load} />
                        ))}
                    </div>
                )}
            </Section>

            <OtherItems items={data.otros} onSaved={load} />

            <Simulator netWorth={r.patrimonio_neto} />

            <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                <BuildingLibraryIcon className="h-4 w-4 shrink-0" />
                <span>
                    Valores estimados con la {data.datos_oficiales.fuente} (último dato: {data.datos_oficiales.ultimo_trimestre.replace('-T', ', trimestre ')}).
                    Solo incluye municipios de más de 25.000 habitantes; si compraste antes de 2005 se toma el primer dato publicado. Es una referencia, no una tasación.
                </span>
            </p>
        </PageStack>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <div className="mt-1">{children}</div>
            {hint && <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
        </label>
    );
}

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-white';

function PropertyForm({ initial, onCancel, onSaved }: { initial: PortfolioProperty | null; onCancel: () => void; onSaved: () => void }) {
    const [f, setF] = useState<FormState>(initial ? toForm(initial) : EMPTY_FORM);
    const [options, setOptions] = useState<MunicipioOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k: keyof PortfolioPropertyInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(prev => ({ ...prev, [k]: e.target.value }));

    useEffect(() => {
        const q = f.municipio.trim();
        if (q.length < 2) { setOptions([]); return; }
        const id = setTimeout(() => apiService.searchMunicipios(q).then(setOptions).catch(() => setOptions([])), 250);
        return () => clearTimeout(id);
    }, [f.municipio]);

    const chosen = options.find(o => o.municipio.toLowerCase() === f.municipio.trim().toLowerCase());

    const money = (k: keyof PortfolioPropertyInput, label: string, hint?: string) => (
        <Field label={label} hint={hint}>
            <input type="number" inputMode="decimal" min={0} step="any" value={f[k]} onChange={set(k)} className={inputClass} />
        </Field>
    );

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const input = toInput(f);
            if (chosen) input.provincia = chosen.provincia;
            await apiService.savePortfolioProperty(input, initial?.id);
            onSaved();
        } catch (err: any) {
            setError(err?.message || 'No se ha podido guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Section title={initial ? `Editar «${initial.name}»` : 'Añadir vivienda'} description="Solo el nombre y el precio de compra son obligatorios; cuanto más completes, más preciso el cálculo.">
            <form onSubmit={submit} className="space-y-6">
                <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <legend className="sr-only">Datos de la vivienda</legend>
                    <Field label="Nombre *"><input required maxLength={120} value={f.name} onChange={set('name')} placeholder="Piso de la calle Mayor" className={inputClass} /></Field>
                    <Field label="Dirección"><input maxLength={200} value={f.address} onChange={set('address')} className={inputClass} /></Field>
                    <Field label="Municipio (datos oficiales)" hint={chosen?.eur_m2 ? `Valor tasado medio: ${formatEur(chosen.eur_m2)}/m²` : 'Municipios de más de 25.000 habitantes; si el tuyo no sale, elige el más cercano.'}>
                        <input list="portfolio-municipios" maxLength={100} value={f.municipio} onChange={set('municipio')} placeholder="Murcia" className={inputClass} autoComplete="off" />
                        <datalist id="portfolio-municipios">
                            {options.map(o => <option key={`${o.provincia}-${o.municipio}`} value={o.municipio}>{o.provincia}</option>)}
                        </datalist>
                    </Field>
                    <Field label="Superficie (m²)"><input type="number" inputMode="decimal" min={0} step="any" value={f.area_m2} onChange={set('area_m2')} className={inputClass} /></Field>
                    <Field label="Fecha de compra"><input type="date" max={new Date().toISOString().slice(0, 10)} value={f.purchase_date} onChange={set('purchase_date')} className={inputClass} /></Field>
                    <Field label="Precio de compra (€) *"><input required type="number" inputMode="decimal" min={1} step="any" value={f.purchase_price} onChange={set('purchase_price')} className={inputClass} /></Field>
                    {money('purchase_costs', 'Gastos de compra (€)', 'Impuestos, notaría, gestoría, reforma inicial')}
                    {money('current_value_manual', 'Valor actual (opcional)', 'Si lo rellenas, se usa en lugar de la estimación')}
                </fieldset>

                <fieldset>
                    <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Hipoteca</legend>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {money('mortgage_pending', 'Capital pendiente (€)')}
                        {money('mortgage_monthly', 'Cuota mensual (€)')}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Alquiler y gastos</legend>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {money('rent_monthly', 'Alquiler mensual (€)', 'Déjalo vacío si vives en ella o está vacía')}
                        {money('community_monthly', 'Comunidad al mes (€)')}
                        {money('ibi_yearly', 'IBI al año (€)')}
                        {money('insurance_yearly', 'Seguro al año (€)')}
                        {money('other_yearly', 'Otros gastos al año (€)', 'Mantenimiento, derramas, gestión…')}
                    </div>
                </fieldset>

                <Field label="Notas"><textarea maxLength={2000} rows={2} value={f.notes} onChange={set('notes')} className={inputClass} /></Field>

                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={saving} className={buttonClass.primary}>{saving ? 'Guardando…' : 'Guardar'}</button>
                    <button type="button" onClick={onCancel} className={buttonClass.secondary}>Cancelar</button>
                </div>
            </form>
        </Section>
    );
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'good' | 'bad' }) {
    const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white';
    return (
        <div>
            <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className={`text-sm font-semibold ${color}`}>{value}</dd>
        </div>
    );
}

function PropertyCard({ p, onEdit, onDeleted }: { p: PortfolioProperty; onEdit: () => void; onDeleted: () => void }) {
    const c = p.calculo;
    const [confirming, setConfirming] = useState(false);
    const remove = async () => {
        await apiService.deletePortfolioProperty(p.id);
        onDeleted();
    };
    return (
        <article className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{[p.address, p.municipio].filter(Boolean).join(' · ') || 'Sin ubicación'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {confirming ? (
                        <>
                            <button type="button" onClick={remove} className={buttonClass.danger}>Eliminar</button>
                            <button type="button" onClick={() => setConfirming(false)} className={buttonClass.ghost}>No</button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={onEdit} className={iconButtonClass.neutral} aria-label={`Editar ${p.name}`}><PencilSquareIcon className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setConfirming(true)} className={iconButtonClass.danger} aria-label={`Eliminar ${p.name}`}><TrashIcon className="h-4 w-4" /></button>
                        </>
                    )}
                </div>
            </div>

            <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{formatEur(c.valor)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{METHOD_LABEL[c.metodo]}</p>

            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric label="Desde la compra" value={`${signed(c.plusvalia)} (${percent(c.plusvalia_porcentaje)})`} tone={c.plusvalia >= 0 ? 'good' : 'bad'} />
                <Metric label="Te pertenece" value={formatEur(c.patrimonio_neto)} />
                <Metric label="Hipoteca pendiente" value={formatEur(p.mortgage_pending || 0)} />
                <Metric label="Rentabilidad bruta" value={percent(c.rentabilidad_bruta)} />
                <Metric label="Rentabilidad neta" value={percent(c.rentabilidad_neta)} />
                <Metric label="Flujo al mes" value={signed(c.flujo_caja_mensual)} tone={c.flujo_caja_mensual < 0 ? 'bad' : c.flujo_caja_mensual > 0 ? 'good' : undefined} />
            </dl>
        </article>
    );
}

function EvolutionChart({ points, source }: { points: { trimestre: string; valor: number }[]; source: string }) {
    const data = useMemo(() => points.map(p => ({ ...p, label: p.trimestre.replace('-T', ' T') })), [points]);
    return (
        <Section title="Evolución estimada del valor" description="Valor de tus viviendas trimestre a trimestre, según la evolución oficial del m² en cada municipio.">
            <div className="h-64" role="img" aria-label={`Evolución del valor de tus viviendas: de ${formatEur(points[0].valor)} a ${formatEur(points[points.length - 1].valor)}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <defs>
                            <linearGradient id="portfolioValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} minTickGap={32} tickLine={false} axisLine={false} />
                        <YAxis width={72} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `${Math.round(v / 1000)} mil €`} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip formatter={(v: number) => [formatEur(v), 'Valor estimado']} labelFormatter={l => `${l}`} />
                        <Area type="monotone" dataKey="valor" stroke="#059669" strokeWidth={2} fill="url(#portfolioValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="sr-only">Fuente: {source}</p>
        </Section>
    );
}

function OtherItems({ items, onSaved }: { items: PortfolioItem[]; onSaved: () => void }) {
    const [kind, setKind] = useState<PortfolioItem['kind']>('asset');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async (next: PortfolioItem[]) => {
        setSaving(true);
        setError('');
        try {
            await apiService.savePortfolioItems(next);
            onSaved();
        } catch (e: any) {
            setError(e?.message || 'No se ha podido guardar.');
        } finally {
            setSaving(false);
        }
    };

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(amount.replace(',', '.'));
        if (!name.trim() || !Number.isFinite(value) || value < 0) return;
        await save([...items, { kind, name: name.trim(), amount: value }]);
        setName('');
        setAmount('');
    };

    const list = (k: PortfolioItem['kind'], title: string) => {
        const rows = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.kind === k);
        return (
            <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title} · {formatEur(rows.reduce((s, { it }) => s + it.amount, 0))}</h3>
                {rows.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Nada apuntado.</p> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {rows.map(({ it, idx }) => (
                            <li key={idx} className="flex items-center justify-between gap-2 py-2 text-sm">
                                <span className="text-gray-700 dark:text-gray-200 truncate">{it.name}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                    <span className="font-medium text-gray-900 dark:text-white">{formatEur(it.amount)}</span>
                                    <button type="button" disabled={saving} onClick={() => save(items.filter((_, i) => i !== idx))} className={iconButtonClass.danger} aria-label={`Quitar ${it.name}`}><TrashIcon className="h-4 w-4" /></button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <Section title="Otros bienes y deudas" description="Ahorros, inversiones, vehículos, préstamos… para que el patrimonio neto sea completo.">
            <div className="grid gap-6 md:grid-cols-2">
                {list('asset', 'Bienes')}
                {list('liability', 'Deudas')}
            </div>
            <form onSubmit={add} className="mt-6 grid gap-3 sm:grid-cols-[auto_1fr_10rem_auto] items-end">
                <Field label="Tipo">
                    <select value={kind} onChange={e => setKind(e.target.value as PortfolioItem['kind'])} className={inputClass}>
                        <option value="asset">Bien</option>
                        <option value="liability">Deuda</option>
                    </select>
                </Field>
                <Field label="Concepto"><input maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'asset' ? 'Ahorros' : 'Préstamo del coche'} className={inputClass} /></Field>
                <Field label="Importe (€)"><input type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} /></Field>
                <button type="submit" disabled={saving || !name.trim() || amount === ''} className={buttonClass.secondary}><PlusIcon className="h-4 w-4" /> Añadir</button>
            </form>
            {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Section>
    );
}

function Simulator({ netWorth }: { netWorth: number }) {
    const [open, setOpen] = useState(false);
    const [monthly, setMonthly] = useState('300');
    const [rate, setRate] = useState('5');
    const [years, setYears] = useState('10');

    const m = Math.max(0, Number(monthly) || 0);
    const monthlyRate = (Number(rate) || 0) / 100 / 12;
    const months = Math.min(600, Math.max(0, Math.round((Number(years) || 0) * 12)));
    let future = 0;
    for (let i = 0; i < months; i++) future = (future + m) * (1 + monthlyRate);
    const contributed = m * months;

    return (
        <Section
            title="Simulador de ahorro"
            description="Cuánto tendrías si inviertes una cantidad cada mes."
            actions={<button type="button" onClick={() => setOpen(o => !o)} className={buttonClass.secondary}><CalculatorIcon className="h-4 w-4" />{open ? 'Ocultar' : 'Abrir'}</button>}
        >
            {open ? (
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                        <Field label="Al mes (€)"><input type="number" min={0} value={monthly} onChange={e => setMonthly(e.target.value)} className={inputClass} /></Field>
                        <Field label="Rentabilidad anual (%)"><input type="number" min={0} max={30} step="0.1" value={rate} onChange={e => setRate(e.target.value)} className={inputClass} /></Field>
                        <Field label="Años"><input type="number" min={1} max={50} value={years} onChange={e => setYears(e.target.value)} className={inputClass} /></Field>
                    </div>
                    <dl className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
                        <Metric label="Aportas" value={formatEur(contributed)} />
                        <Metric label="Ganancia estimada" value={formatEur(future - contributed)} tone="good" />
                        <Metric label="Tendrías invertido" value={formatEur(future)} />
                        <Metric label="Patrimonio previsto" value={formatEur(netWorth + future)} />
                    </dl>
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><ChartBarIcon className="h-4 w-4" />Interés compuesto mensual sobre tus aportaciones; orientativo.</p>
            )}
        </Section>
    );
}
