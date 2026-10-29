import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowTrendingUpIcon, BanknotesIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

/** Rentabilidad neta anual de una propiedad a partir de los datos financieros que introdujo su propietario. */
function propertyRoi(p: Property): number | null {
  const cost = p.totalCost || p.purchasePrice || 0;
  if (cost <= 0 || !(p.monthlyIncome || p.monthlyCost)) return null;
  return (((p.monthlyIncome || 0) - (p.monthlyCost || 0)) * 12 / cost) * 100;
}

export default function DashboardInvestments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        setProperties(await apiService.getUserProperties());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus inversiones.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, apiService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Solo cuentan las propiedades con coste y rentas/gastos informados
  const withData = properties
    .map(p => ({ property: p, roi: propertyRoi(p) }))
    .filter((x): x is { property: Property; roi: number } => x.roi !== null);

  const totalCost = withData.reduce((s, x) => s + (x.property.totalCost || x.property.purchasePrice || 0), 0);
  const annualNet = withData.reduce((s, x) => s + ((x.property.monthlyIncome || 0) - (x.property.monthlyCost || 0)) * 12, 0);
  const weightedRoi = totalCost > 0 ? (annualNet / totalCost) * 100 : 0;

  const byType: Record<string, { total: number; count: number }> = {};
  withData.forEach(({ property, roi }) => {
    const key = property.type || 'otro';
    byType[key] = byType[key] || { total: 0, count: 0 };
    byType[key].total += roi;
    byType[key].count += 1;
  });
  const roiData = Object.entries(byType).map(([propertyType, d]) => ({
    propertyType,
    averageROI: Number((d.total / d.count).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.investments')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Rentabilidad calculada con el coste, los ingresos y los gastos que has indicado en tus propiedades
        </p>
      </motion.div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Rentabilidad neta media</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{withData.length ? `${weightedRoi.toFixed(1)} %` : '—'}</p>
          </div>
          <div className="p-3 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <ArrowTrendingUpIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Flujo neto anual</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{eur(annualNet)}</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <BanknotesIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Propiedades con datos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{withData.length} / {properties.length}</p>
          </div>
          <div className="p-3 rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400">
            <CalculatorIcon className="h-6 w-6" />
          </div>
        </div>
      </div>

      {withData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          Indica el coste total y los ingresos o gastos mensuales en{' '}
          <Link to="/dashboard/properties" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">tus propiedades</Link>{' '}
          para ver aquí su rentabilidad.
        </div>
      ) : (
        <>
          {roiData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rentabilidad media por tipo de propiedad (%)</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={roiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="propertyType" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }}
                  />
                  <Bar dataKey="averageROI" name="Rentabilidad %" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalle por propiedad</h2>
            <div className="space-y-3">
              {withData
                .sort((a, b) => b.roi - a.roi)
                .map(({ property: p, roi }) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Coste {eur(p.totalCost || p.purchasePrice || 0)} · {eur((p.monthlyIncome || 0) - (p.monthlyCost || 0))}/mes netos
                      </p>
                    </div>
                    <p className={`text-lg font-bold whitespace-nowrap ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{roi.toFixed(1)} %</p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
