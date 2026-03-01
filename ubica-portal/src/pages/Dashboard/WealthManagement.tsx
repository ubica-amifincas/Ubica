import React, { useState, useEffect } from 'react';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    PlusIcon,
    TrashIcon,
    CalculatorIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';

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
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex justify-between items-center"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Gestión de Patrimonio
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Añade activos y pasivos libremente para auto-calcular tu patrimonio real.
                    </p>
                </div>
                <button
                    onClick={() => setShowSimulator(!showSimulator)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${showSimulator
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                        }`}
                >
                    <CalculatorIcon className="h-5 w-5" />
                    Simulador
                </button>
            </motion.div>

            {/* Summary Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activos Totales</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">€{totalAssets.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pasivos Totales</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">€{totalLiabilities.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg p-6 shadow-lg text-center transform md:scale-105 transition-transform duration-300 flex flex-col items-center justify-center border border-emerald-500">
                    <p className="text-sm font-medium text-emerald-100 uppercase tracking-wide">Patrimonio Neto (Net Worth)</p>
                    <p className="text-4xl font-extrabold text-white mt-2">€{netWorth.toLocaleString()}</p>
                </div>
            </motion.div>

            {/* Simulator Section */}
            {showSimulator && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-emerald-600" />
                            Simulador Financiero
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Proyecta tu patrimonio futuro con datos mensuales y anuales</p>
                    </div>

                    <div className="p-6">
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
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">📅 Resumen Mensual</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos</span>
                                        <span className="text-sm font-semibold text-green-600">+€{monthlyIncome.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Gastos</span>
                                        <span className="text-sm font-semibold text-red-500">-€{monthlyExpenses.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Inversión</span>
                                        <span className="text-sm font-semibold text-blue-600">€{monthlyInvestment.toLocaleString()}</span>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-600" />
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Ahorro disponible</span>
                                        <span className={`text-lg font-bold ${monthlySavings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            €{monthlySavings.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ahorro tras inversión</span>
                                        <span className={`text-sm font-semibold ${(monthlySavings - monthlyInvestment) >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-500'}`}>
                                            €{(monthlySavings - monthlyInvestment).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Annual projection */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">📊 Proyección a {years} {years === 1 ? 'año' : 'años'}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ahorro anual</span>
                                        <span className="text-sm font-semibold text-green-600">€{annualSavings.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Inversión anual</span>
                                        <span className="text-sm font-semibold text-blue-600">€{annualInvestment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Total aportado ({years}a)</span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">€{totalContributions.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Rendimiento compuesto</span>
                                        <span className="text-sm font-semibold text-emerald-600">+€{Math.round(investmentGains).toLocaleString()}</span>
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-600" />
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Valor inversiones</span>
                                        <span className="text-lg font-bold text-blue-600">€{Math.round(futureInvestmentValue).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Patrimonio neto proyectado</span>
                                        <span className={`text-lg font-bold ${projectedNetWorth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            €{Math.round(projectedNetWorth).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Add Item Form */}
            {newItemType && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-emerald-200 dark:border-emerald-800"
                >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Añadir Nuevo {newItemType === 'asset' ? 'Activo' : 'Pasivo'}
                    </h3>
                    <form onSubmit={handleAddItem} className="space-y-4 md:space-y-0 md:flex md:gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                            <input
                                type="text"
                                required
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder={newItemType === 'asset' ? "Ej. Cuenta Ahorro BBVA" : "Ej. Hipoteca Vivienda"}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción corta</label>
                            <input
                                type="text"
                                value={newItemDesc}
                                onChange={e => setNewItemDesc(e.target.value)}
                                placeholder="Opcional..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            <button
                                type="submit"
                                className="flex-1 md:flex-none justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                            >
                                Añadir
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewItemType(null)}
                                className="flex-1 md:flex-none justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Assets & Liabilities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets Column */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col"
                >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <ArrowTrendingUpIcon className="h-6 w-6 mr-2 text-green-500" />
                            Mis Activos (Assets)
                        </h3>
                        <button
                            onClick={() => setNewItemType('asset')}
                            className="text-sm flex items-center text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-md"
                        >
                            <PlusIcon className="h-4 w-4 mr-1" /> Nuevo Activo
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex-grow">
                        {/* Auto property value */}
                        {propertiesValue > 0 && (
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                                <div className="flex-1 pr-4">
                                    <p className="font-medium text-gray-900 dark:text-white text-lg">Portafolio Inmobiliario</p>
                                    <p className="text-sm text-gray-500 mt-0.5">Valor de propiedades en Ubica (Automático)</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                    €{propertiesValue.toLocaleString()}
                                </p>
                            </div>
                        )}

                        {assets.length === 0 && propertiesValue === 0 ? (
                            <div className="text-center py-10">
                                <ArrowTrendingUpIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 mb-1">No tienes activos registrados</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">Pulsa "Nuevo Activo" para añadir cuentas, inversiones, etc.</p>
                            </div>
                        ) : (
                            assets.map(asset => (
                                <div key={asset.id} className="flex justify-between items-start border-b border-gray-50 dark:border-gray-750 pb-4 group">
                                    <div className="flex-1 pr-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{asset.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                            €{asset.amount.toLocaleString()}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteItem('asset', asset.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar activo"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Liabilities Column */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col"
                >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <ArrowTrendingDownIcon className="h-6 w-6 mr-2 text-red-500" />
                            Mis Pasivos (Liabilities)
                        </h3>
                        <button
                            onClick={() => setNewItemType('liability')}
                            className="text-sm flex items-center text-red-600 hover:text-red-700 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-md"
                        >
                            <PlusIcon className="h-4 w-4 mr-1" /> Nuevo Pasivo
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex-grow">
                        {liabilities.length === 0 ? (
                            <div className="text-center py-10">
                                <ArrowTrendingDownIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 mb-1">No tienes pasivos registrados</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">Pulsa "Nuevo Pasivo" para añadir hipotecas, préstamos, etc.</p>
                            </div>
                        ) : (
                            liabilities.map(liability => (
                                <div key={liability.id} className="flex justify-between items-start border-b border-gray-50 dark:border-gray-750 pb-4 group">
                                    <div className="flex-1 pr-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{liability.name}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{liability.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                            €{liability.amount.toLocaleString()}
                                        </p>
                                        <button
                                            onClick={() => handleDeleteItem('liability', liability.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar pasivo"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
