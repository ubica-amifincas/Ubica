import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowTrendingUpIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';

export default function DashboardInvestments() {
  const [loading, setLoading] = useState(true);
  const [investmentData, setInvestmentData] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    const loadUserInvestmentData = async () => {
      setLoading(true);
      try {
        const userProperties = await apiService.getUserProperties();

        // ROI por tipo de propiedad
        const typeGroups: Record<string, { totalRoi: number; count: number }> = {};
        userProperties.forEach(p => {
          const typeName = p.type || 'Otro';
          if (!typeGroups[typeName]) typeGroups[typeName] = { totalRoi: 0, count: 0 };
          typeGroups[typeName].count++;
          const cost = p.totalCost || p.price || 1;
          const annualNet = ((p.monthlyIncome || 0) - (p.monthlyCost || 0)) * 12;
          typeGroups[typeName].totalRoi += (annualNet / cost) * 100;
        });

        const roiData = Object.entries(typeGroups).map(([propertyType, data]) => ({
          propertyType,
          averageROI: Number((data.totalRoi / data.count).toFixed(2)),
          count: data.count
        }));
        if (roiData.length === 0) {
          roiData.push(
            { propertyType: 'Apartamento', averageROI: 0, count: 0 },
            { propertyType: 'Casa', averageROI: 0, count: 0 }
          );
        }

        // Precio medio del portafolio
        const avgPrice = userProperties.length > 0
          ? userProperties.reduce((sum, p) => sum + p.price, 0) / userProperties.length
          : 0;

        setInvestmentData({
          roiData,
          marketTrends: [
            { quarter: 'Q1', averagePrice: avgPrice, growth: 0 },
            { quarter: 'Q2', averagePrice: avgPrice, growth: 0 },
            { quarter: 'Q3', averagePrice: avgPrice, growth: 0 },
            { quarter: 'Q4', averagePrice: avgPrice, growth: 0 }
          ],
          timeOnMarket: {
            average: 0,
            byType: Object.fromEntries(
              Object.keys(typeGroups).map(t => [t.toLowerCase(), 0])
            )
          }
        });
      } catch (error) {
        console.error('Error loading investment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserInvestmentData();
  }, [user]);

  if (loading || !investmentData) {
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
          {t('dashboard.investments')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Análisis de rentabilidad y oportunidades de inversión
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
                ROI Promedio
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(investmentData.roiData.reduce((sum: number, item: any) => sum + item.averageROI, 0) / (investmentData.roiData.length || 1)).toFixed(1)}%
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
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tiempo Promedio en Mercado
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {investmentData.timeOnMarket.average} meses
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <ClockIcon className="h-6 w-6" />
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
                Crecimiento del Mercado
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {investmentData.marketTrends[investmentData.marketTrends.length - 1]?.growth || 0}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <CurrencyDollarIcon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ROI by Property Type */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ROI por Tipo de Propiedad
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={investmentData.roiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="propertyType" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Bar dataKey="averageROI" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Market Trends */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tendencias del Mercado Inmobiliario
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={investmentData.marketTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="quarter" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Line
              type="monotone"
              dataKey="averagePrice"
              stroke="#3B82F6"
              strokeWidth={3}
              name="Precio Promedio"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Time on Market by Type */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tiempo en Mercado por Tipo de Propiedad
        </h2>
        <div className="space-y-4">
          {Object.entries(investmentData.timeOnMarket.byType).map(([type, time]) => (
            <div key={type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                  {type}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tipo de propiedad
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {time as string}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  meses promedio
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Investment Recommendations */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recomendaciones de Inversión
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-green-600 dark:text-green-400 mb-2">
              🟢 Oportunidad Alta
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Los estudios muestran el mayor ROI (9.2%) y menor tiempo en mercado.
              Ideal para inversión a corto plazo.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
              🔵 Crecimiento Sostenido
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Las villas mantienen un crecimiento estable del 8.8% ROI con buena
              liquidez en el mercado de Murcia.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
