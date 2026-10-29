import React, { useState, useEffect } from 'react';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    PlusIcon,
    TrashIcon,
    CalculatorIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { PageHeader, StatCard, StatGrid, Section, EmptyState, buttonClass, iconButtonClass, formatEur } from '../../components/dashboard/ui';

interface WealthItem {
    id: string;
    name: string;
    description: string;
    amount: number;
}

const STORAGE_KEY_ASSETS = 'ubica_wealth_assets';
const STORAGE_KEY_LIABILITIES = 'ubica_wealth_liabilities';

export default function WealthManagement() {
    const apiService = useAuthenticatedFetch();
    const [propertiesValue, setPropertiesValue] = useState(0);

    // Load from localStorage or start empty
    const [assets, setAssets] = useState<WealthItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_ASSETS);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [liabilities, setLiabilities] = useState<WealthItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_LIABILITIES);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // Persist to localStorage
    useEffect(() => { localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets)); }, [assets]);
    useEffect(() => { localStorage.setItem(STORAGE_KEY_LIABILITIES, JSON.stringify(liabilities)); }, [liabilities]);

    // Load real property value
    useEffect(() => {
        const loadPropertiesValue = async () => {
            try {
                const userProperties = await apiService.getUserProperties();
                const totalValue = userProperties.reduce((sum, p) => sum + (p.totalCost || p.price || 0), 0);
                setPropertiesValue(totalValue);
            } catch (error) {
                console.error('Error loading properties value:', error);
            }
        };
        loadPropertiesValue();
    }, []);

    // Form states
    const [newItemType, setNewItemType] = useState<'asset' | 'liability' | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');

    // Simulator states
    const [showSimulator, setShowSimulator] = useState(false);
    const [simMonthlyIncome, setSimMonthlyIncome] = useState('');
    const [simMonthlyExpenses, setSimMonthlyExpenses] = useState('');
    const [simMonthlyInvestment, setSimMonthlyInvestment] = useState('');
    const [simAnnualReturn, setSimAnnualReturn] = useState('7');
    const [simYears, setSimYears] = useState('10');

    // Calculations
    const dynamicAssetsTotal = assets.reduce((sum, item) => sum + item.amount, 0);
    const dynamicLiabilitiesTotal = liabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalAssets = propertiesValue + dynamicAssetsTotal;
    const totalLiabilities = dynamicLiabilitiesTotal;
    const netWorth = totalAssets - totalLiabilities;

    // Simulator calculations
    const monthlyIncome = parseFloat(simMonthlyIncome) || 0;
    const monthlyExpenses = parseFloat(simMonthlyExpenses) || 0;
    const monthlyInvestment = parseFloat(simMonthlyInvestment) || 0;
    const annualReturn = parseFloat(simAnnualReturn) || 0;
    const years = parseInt(simYears) || 10;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const annualSavings = monthlySavings * 12;
    const annualInvestment = monthlyInvestment * 12;
    const monthlyReturnRate = annualReturn / 100 / 12;

    // Future value with compound interest
    let futureInvestmentValue = 0;
    for (let m = 0; m < years * 12; m++) {
        futureInvestmentValue = (futureInvestmentValue + monthlyInvestment) * (1 + monthlyReturnRate);
    }
    const totalContributions = monthlyInvestment * years * 12;
    const investmentGains = futureInvestmentValue - totalContributions;
    const projectedNetWorth = netWorth + (annualSavings * years) + futureInvestmentValue - totalContributions;

    // Handlers
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName || !newItemAmount || !newItemType) return;
        const amountNum = parseInt(newItemAmount.replace(/[^0-9]/g, ''), 10) || 0;
        const newItem: WealthItem = {
            id: Date.now().toString(),
            name: newItemName,
            description: newItemDesc,
            amount: amountNum
        };
        if (newItemType === 'asset') {
            setAssets([...assets, newItem]);
        } else {
            setLiabilities([...liabilities, newItem]);
        }
        setNewItemType(null);
        setNewItemName('');
        setNewItemDesc('');
        setNewItemAmount('');
    };

    const handleDeleteItem = (type: 'asset' | 'liability', id: string) => {
        if (type === 'asset') {
            setAssets(assets.filter(a => a.id !== id));
        } else {
            setLiabilities(liabilities.filter(l => l.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de patrimonio"
                description="Añade activos y pasivos libremente para auto-calcular tu patrimonio real."
                actions={
                    <button
                        type="button"
                        onClick={() => setShowSimulator(!showSimulator)}
                        aria-pressed={showSimulator}
                        className={showSimulator ? buttonClass.primary : buttonClass.secondary}
                    >
                        <CalculatorIcon className="h-5 w-5" />
                        Simulador
                    </button>
                }
            />

            {/* Summary Cards */}
            <StatGrid cols={3}>
                <StatCard label="Activos totales" value={formatEur(totalAssets)} icon={ArrowTrendingUpIcon} tone="neutral" />
                <StatCard label="Pasivos totales" value={formatEur(totalLiabilities)} icon={ArrowTrendingDownIcon} tone="neutral" />
                <StatCard label="Patrimonio neto (net worth)" value={formatEur(netWorth)} icon={ChartBarIcon} hint="Activos menos pasivos" />
            </StatGrid>

            {/* Simulator Section */}
            {showSimulator && (
                <Section title="Simulador financiero" description="Proyecta tu patrimonio futuro con datos mensuales y anuales">
                    <div>
                        {/* Input grid */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ingresos mensuales (€)</label>
                                <input
                                    type="number"
                                    value={simMonthlyIncome}
                                    onChange={e => setSimMonthlyIncome(e.target.value)}
                                    placeholder="3.000"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gastos mensuales (€)</label>
                                <input
                                    type="number"
                                    value={simMonthlyExpenses}
                                    onChange={e => setSimMonthlyExpenses(e.target.value)}
                                    placeholder="2.000"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inversión mensual (€)</label>
                                <input
                                    type="number"
                                    value={simMonthlyInvestment}
                                    onChange={e => setSimMonthlyInvestment(e.target.value)}
                                    placeholder="500"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rentabilidad anual (%)</label>
                                <input
                                    type="number"
                                    value={simAnnualReturn}
                                    onChange={e => setSimAnnualReturn(e.target.value)}
                                    placeholder="7"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Horizonte (años)</label>
                                <input
                                    type="number"
                                    value={simYears}
                                    onChange={e => setSimYears(e.target.value)}
                                    placeholder="10"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Results grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Monthly breakdown */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Resumen mensual</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos</span>
                                        <span className="text-sm font-semibold text-emerald-600">+{formatEur(monthlyIncome)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Gastos</span>
                                        <span className="text-sm font-semibold text-red-500">-{formatEur(monthlyExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Inversión</span>
                                        <span className="text-sm font-semibold text-emerald-600">{formatEur(monthlyInvestment)}</span>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-600" />
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Ahorro disponible</span>
                                        <span className={`text-lg font-bold ${monthlySavings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatEur(monthlySavings)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ahorro tras inversión</span>
                                        <span className={`text-sm font-semibold ${(monthlySavings - monthlyInvestment) >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-500'}`}>
                                            {formatEur((monthlySavings - monthlyInvestment))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Annual projection */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Proyección a {years} {years === 1 ? 'año' : 'años'}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ahorro anual</span>
                                        <span className="text-sm font-semibold text-emerald-600">{formatEur(annualSavings)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Inversión anual</span>
                                        <span className="text-sm font-semibold text-emerald-600">{formatEur(annualInvestment)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Total aportado ({years}a)</span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatEur(totalContributions)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Rendimiento compuesto</span>
                                        <span className="text-sm font-semibold text-emerald-600">+{formatEur(investmentGains)}</span>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-600" />
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Valor inversiones</span>
                                        <span className="text-lg font-bold text-emerald-600">{formatEur(futureInvestmentValue)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Patrimonio neto proyectado</span>
                                        <span className={`text-lg font-bold ${projectedNetWorth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatEur(projectedNetWorth)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>
            )}

            {/* Add Item Form */}
            {newItemType && (
                <Section title={`Añadir nuevo ${newItemType === 'asset' ? 'activo' : 'pasivo'}`}>
                    <form onSubmit={handleAddItem} className="space-y-4 md:space-y-0 md:flex md:gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                            <input
                                type="text"
                                required
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder={newItemType === 'asset' ? "Ej. Cuenta Ahorro BBVA" : "Ej. Hipoteca Vivienda"}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción corta</label>
                            <input
                                type="text"
                                value={newItemDesc}
                                onChange={e => setNewItemDesc(e.target.value)}
                                placeholder="Opcional..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (€)</label>
                            <input
                                type="number"
                                required
                                value={newItemAmount}
                                onChange={e => setNewItemAmount(e.target.value)}
                                placeholder="10000"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            <button
                                type="submit"
                                className={`${buttonClass.primary} flex-1 md:flex-none`}
                            >
                                Añadir
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewItemType(null)}
                                className={`${buttonClass.secondary} flex-1 md:flex-none`}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </Section>
            )}

            {/* Assets & Liabilities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets Column */}
                <Section
                    title="Mis activos (assets)"
                    actions={
                        <button type="button" onClick={() => setNewItemType('asset')} className={`${buttonClass.secondary} px-3 py-1.5`}>
                            <PlusIcon className="h-4 w-4" /> Nuevo activo
                        </button>
                    }
                    className="h-full"
                >
                    <div className="space-y-4">
                        {/* Auto property value */}
                        {propertiesValue > 0 && (
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                                <div className="flex-1 pr-4">
                                    <p className="font-medium text-gray-900 dark:text-white text-lg">Portafolio Inmobiliario</p>
                                    <p className="text-sm text-gray-500 mt-0.5">Valor de propiedades en Ubica (Automático)</p>
                                </div>
                                <p className="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                                    {formatEur(propertiesValue)}
                                </p>
                            </div>
                        )}

                        {assets.length === 0 && propertiesValue === 0 ? (
                            <EmptyState bare icon={ArrowTrendingUpIcon} title="No tienes activos registrados" description='Pulsa "Nuevo activo" para añadir cuentas, inversiones, etc.' />
                        ) : (
                            assets.map(asset => (
                                <div key={asset.id} className="flex justify-between items-start border-b border-gray-50 dark:border-gray-700 pb-4 group">
                                    <div className="flex-1 pr-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{asset.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatEur(asset.amount)}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteItem('asset', asset.id)}
                                            className={`${iconButtonClass.danger} sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100`}
                                            title="Eliminar activo"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Section>

                {/* Liabilities Column */}
                <Section
                    title="Mis pasivos (liabilities)"
                    actions={
                        <button type="button" onClick={() => setNewItemType('liability')} className={`${buttonClass.secondary} px-3 py-1.5`}>
                            <PlusIcon className="h-4 w-4" /> Nuevo pasivo
                        </button>
                    }
                    className="h-full"
                >
                    <div className="space-y-4">
                        {liabilities.length === 0 ? (
                            <EmptyState bare icon={ArrowTrendingDownIcon} title="No tienes pasivos registrados" description='Pulsa "Nuevo pasivo" para añadir hipotecas, préstamos, etc.' />
                        ) : (
                            liabilities.map(liability => (
                                <div key={liability.id} className="flex justify-between items-start border-b border-gray-50 dark:border-gray-700 pb-4 group">
                                    <div className="flex-1 pr-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{liability.name}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{liability.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatEur(liability.amount)}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteItem('liability', liability.id)}
                                            className={`${iconButtonClass.danger} sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100`}
                                            title="Eliminar pasivo"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Section>
            </div>
        </div>
    );
}
