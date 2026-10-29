import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyIcon, BanknotesIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function DashboardRentals() {
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
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus alquileres.');
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

  const rented = properties.filter(p => p.status === 'rented');
  const forRent = properties.filter(p => p.status === 'for-rent');
  const monthlyIncome = rented.reduce((sum, p) => sum + (p.monthlyIncome || 0), 0);
  const rentable = rented.length + forRent.length;
  const occupancy = rentable > 0 ? Math.round((rented.length / rentable) * 100) : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.rentals')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Tus propiedades alquiladas y en alquiler</p>
      </motion.div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Propiedades alquiladas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{rented.length}</p>
          </div>
          <div className="p-3 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
            <KeyIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ingresos mensuales</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{eur(monthlyIncome)}</p>
            <p className="text-xs text-gray-400 mt-1">Según los ingresos que has indicado</p>
          </div>
          <div className="p-3 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <BanknotesIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ocupación</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{occupancy === null ? '—' : `${occupancy} %`}</p>
            <p className="text-xs text-gray-400 mt-1">{rented.length} de {rentable} destinadas a alquiler</p>
          </div>
          <div className="p-3 rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400">
            <HomeIcon className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Propiedades alquiladas</h2>
        {rented.length === 0 ? (
          <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            No tienes propiedades marcadas como alquiladas.
          </div>
        ) : (
          <div className="space-y-3">
            {rented.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="min-w-0">
                  <Link to={`/property/${p.id}`} className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 truncate block">
                    {p.title}
                  </Link>
                  {p.location && <p className="text-sm text-gray-600 dark:text-gray-400">{p.location}</p>}
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {p.monthlyIncome ? `${eur(p.monthlyIncome)}/mes` : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
