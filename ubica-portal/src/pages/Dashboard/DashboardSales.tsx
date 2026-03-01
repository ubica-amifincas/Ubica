import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BanknotesIcon, ArrowTrendingUpIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';

export default function DashboardSales() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    const loadUserSalesData = async () => {
      setLoading(true);
      try {
        const userProperties = await apiService.getUserProperties();
        const soldProperties = userProperties.filter(p => p.status === 'sold');

        const totalRevenue = soldProperties.reduce((sum, p) => sum + p.price, 0);
        const totalCommissions = totalRevenue * 0.03; // 3% comisión

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const salesPerMonth = soldProperties.length > 0 ? Math.ceil(soldProperties.length / 6) : 0;
        const revenuePerMonth = totalRevenue > 0 ? totalRevenue / 6 : 0;

        setSalesData({
          totalCommissions,
          monthlyData: months.map(month => ({
            month,
            sales: salesPerMonth,
            revenue: revenuePerMonth
          })),
          topProperties: soldProperties.slice(0, 5).map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            commission: p.price * 0.03
          }))
        });
      } catch (error) {
        console.error('Error loading sales data:', error);
        setSalesData({
          totalCommissions: 0,
          monthlyData: [],
          topProperties: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserSalesData();
  }, [user]);

  if (loading || !salesData) {
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
          {t('dashboard.sales')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Análisis detallado de ventas realizadas
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
                Total Ventas
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {salesData.monthlyData.reduce((sum, item) => sum + item.sales, 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <BanknotesIcon className="h-6 w-6" />
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
                Ingresos Totales
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0
                }).format(salesData.monthlyData.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
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
                Comisiones
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0
                }).format(salesData.totalCommissions)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <CalendarIcon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sales Chart */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ventas Mensuales
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={salesData.monthlyData}>
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
            <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top Properties */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Propiedades Más Vendidas
        </h2>
        <div className="space-y-4">
          {salesData.topProperties.length > 0 ? (
            salesData.topProperties.map((property: any, index: number) => (
              <div key={property.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {property.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    #{index + 1} en ventas
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0
                    }).format(property.price)}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Comisión: {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0
                    }).format(property.commission)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
              Aún no tienes propiedades vendidas en tu portafolio personal.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
