import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KeyIcon, ArrowTrendingUpIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';

export default function DashboardRentals() {
  const [loading, setLoading] = useState(true);
  const [rentalData, setRentalData] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    const loadUserRentalData = async () => {
      setLoading(true);
      try {
        const userProperties = await apiService.getUserProperties();
        const rentedProperties = userProperties.filter(p => p.status === 'rented');
        const totalMonthlyIncome = rentedProperties.reduce((sum, p) => sum + (p.monthlyIncome || 0), 0);
        const occupancy = userProperties.length > 0
          ? Math.round((rentedProperties.length / userProperties.length) * 100)
          : 0;

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

        setRentalData({
          monthlyIncome: months.map(month => ({
            month,
            income: totalMonthlyIncome,
            properties: rentedProperties.length
          })),
          averageOccupancy: occupancy,
          topRentals: rentedProperties.slice(0, 5).map(p => ({
            id: p.id,
            title: p.title,
            monthlyRent: p.monthlyIncome || 0,
            occupancy: 100
          }))
        });
      } catch (error) {
        console.error('Error loading rental data:', error);
        setRentalData({
          monthlyIncome: [],
          averageOccupancy: 0,
          topRentals: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserRentalData();
  }, [user]);

  if (loading || !rentalData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.rentals')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Análisis de ingresos por alquileres
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Propiedades Alquiladas
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rentalData.monthlyIncome[rentalData.monthlyIncome.length - 1]?.properties || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <HomeIcon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Ingreso Mensual
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0
                }).format(rentalData.monthlyIncome[rentalData.monthlyIncome.length - 1]?.income || 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <ArrowTrendingUpIcon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tasa de Ocupación
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rentalData.averageOccupancy}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <KeyIcon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Income Chart */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Evolución de Ingresos Mensuales
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={rentalData.monthlyIncome}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top Rentals */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Propiedades Más Rentables
        </h2>
        <div className="space-y-4">
          {rentalData.topRentals.length > 0 ? (
            rentalData.topRentals.map((rental: any, index: number) => (
              <div key={rental.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {rental.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    #{index + 1} en rentabilidad
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0
                    }).format(rental.monthlyRent)}/mes
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Ocupación: {rental.occupancy}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
              Aún no tienes propiedades alquiladas en tu portafolio personal.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
