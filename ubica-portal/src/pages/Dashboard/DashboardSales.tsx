import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function DashboardSales() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sold, setSold] = useState<Property[]>([]);
  const [forSale, setForSale] = useState(0);
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const userProperties = await apiService.getUserProperties();
        setSold(userProperties.filter(p => p.status === 'sold'));
        setForSale(userProperties.filter(p => p.status === 'for-sale').length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus ventas.');
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

  const totalValue = sold.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.sales')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Tus propiedades marcadas como vendidas</p>
      </motion.div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Propiedades vendidas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sold.length}</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <BanknotesIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Importe de las ventas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{eur(totalValue)}</p>
            <p className="text-xs text-gray-400 mt-1">Según el precio publicado</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <ArrowTrendingUpIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aún en venta</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{forSale}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Propiedades vendidas</h2>
        {sold.length === 0 ? (
          <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            Aún no tienes propiedades marcadas como vendidas.
          </div>
        ) : (
          <div className="space-y-3">
            {sold.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="min-w-0">
                  <Link to={`/property/${p.id}`} className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 truncate block">
                    {p.title}
                  </Link>
                  {p.location && <p className="text-sm text-gray-600 dark:text-gray-400">{p.location}</p>}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{eur(p.price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
