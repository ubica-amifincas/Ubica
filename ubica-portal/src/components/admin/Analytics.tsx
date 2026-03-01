import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  UsersIcon,
  HomeIcon,
  CurrencyEuroIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalProperties: number;
    totalViews: number;
    totalRevenue: number;
    conversionRate: number;
    avgTimeOnSite: string;
  };
  userActivity: {
    daily: Array<{ date: string; users: number; newUsers: number }>;
    byRole: Array<{ role: string; count: number; percentage: number }>;
    topPages: Array<{ page: string; views: number; uniqueViews: number }>;
  };
  propertyMetrics: {
    byType: Array<{ type: string; count: number; avgPrice: number }>;
    byLocation: Array<{ location: string; count: number; avgViews: number }>;
    viewsOverTime: Array<{ date: string; views: number; inquiries: number }>;
  };
  revenue: {
    monthly: Array<{ month: string; amount: number; transactions: number }>;
    bySource: Array<{ source: string; amount: number; percentage: number }>;
    projections: Array<{ month: string; projected: number; actual?: number }>;
  };
  marketTrends: {
    priceIndex: Array<{ date: string; index: number; change: number }>;
    demandMetrics: Array<{ metric: string; value: number; trend: 'up' | 'down' | 'stable' }>;
    competitorAnalysis: Array<{ competitor: string; marketShare: number; avgPrice: number }>;
  };
}

const AnalyticsComponent: React.FC = () => {
  const { t } = useLanguage();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last30Days');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const generateMockAnalyticsData = (): AnalyticsData => {
    // Generate mock data for demonstration
    const generateDailyData = (days: number) => {
      const data = [];
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 50) + 20,
          newUsers: Math.floor(Math.random() * 15) + 5
        });
      }
      return data;
    };

    const generateMonthlyRevenue = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map(month => ({
        month,
        amount: Math.floor(Math.random() * 50000) + 10000,
        transactions: Math.floor(Math.random() * 100) + 20
      }));
    };

    return {
      overview: {
        totalUsers: 1247,
        totalProperties: 189,
        totalViews: 12543,
        totalRevenue: 186500,
        conversionRate: 3.2,
        avgTimeOnSite: '4:32'
      },
      userActivity: {
        daily: generateDailyData(30),
        byRole: [
          { role: 'Investor', count: 523, percentage: 42 },
          { role: 'User', count: 498, percentage: 40 },
          { role: 'Realtor', count: 186, percentage: 15 },
          { role: 'Admin', count: 40, percentage: 3 }
        ],
        topPages: [
          { page: '/properties', views: 4521, uniqueViews: 3892 },
          { page: '/dashboard', views: 3214, uniqueViews: 1876 },
          { page: '/property/123', views: 2876, uniqueViews: 2543 },
          { page: '/search', views: 1987, uniqueViews: 1654 }
        ]
      },
      propertyMetrics: {
        byType: [
          { type: 'Apartment', count: 78, avgPrice: 145000 },
          { type: 'Villa', count: 45, avgPrice: 285000 },
          { type: 'House', count: 34, avgPrice: 198000 },
          { type: 'Penthouse', count: 18, avgPrice: 420000 },
          { type: 'Studio', count: 14, avgPrice: 89000 }
        ],
        byLocation: [
          { location: 'Murcia Centro', count: 45, avgViews: 234 },
          { location: 'Cartagena', count: 38, avgViews: 198 },
          { location: 'La Manga', count: 32, avgViews: 312 },
          { location: 'Lorca', count: 28, avgViews: 156 },
          { location: 'Águilas', count: 25, avgViews: 189 }
        ],
        viewsOverTime: generateDailyData(30).map(d => ({
          date: d.date,
          views: d.users * 8,
          inquiries: Math.floor(d.users * 0.15)
        }))
      },
      revenue: {
        monthly: generateMonthlyRevenue(),
        bySource: [
          { source: 'Property Sales', amount: 125000, percentage: 67 },
          { source: 'Rental Commissions', amount: 35000, percentage: 19 },
          { source: 'Premium Listings', amount: 18500, percentage: 10 },
          { source: 'Advertising', amount: 8000, percentage: 4 }
        ],
        projections: [
          { month: 'Jul', projected: 45000, actual: 42000 },
          { month: 'Aug', projected: 52000, actual: 48000 },
          { month: 'Sep', projected: 58000 },
          { month: 'Oct', projected: 61000 },
          { month: 'Nov', projected: 65000 },
          { month: 'Dec', projected: 72000 }
        ]
      },
      marketTrends: {
        priceIndex: generateDailyData(30).map((d, i) => ({
          date: d.date,
          index: 100 + (i * 0.2) + (Math.random() * 4 - 2),
          change: Math.random() * 4 - 2
        })),
        demandMetrics: [
          { metric: 'Search Volume', value: 8.5, trend: 'up' },
          { metric: 'Inquiry Rate', value: 3.2, trend: 'up' },
          { metric: 'Time on Market', value: 45, trend: 'down' },
          { metric: 'Price per m²', value: 1850, trend: 'up' },
          { metric: 'Inventory Turnover', value: 2.3, trend: 'stable' }
        ],
        competitorAnalysis: [
          { competitor: 'Idealista', marketShare: 35, avgPrice: 195000 },
          { competitor: 'Fotocasa', marketShare: 28, avgPrice: 189000 },
          { competitor: 'Habitaclia', marketShare: 18, avgPrice: 201000 },
          { competitor: 'Ubica', marketShare: 12, avgPrice: 185000 },
          { competitor: 'Others', marketShare: 7, avgPrice: 178000 }
        ]
      }
    };
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const data = generateMockAnalyticsData();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!analyticsData) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      data: analyticsData
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ubica_analytics_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full"></div>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-48"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-64"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-32"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-32"></div>
          </div>
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-24">
              <div className="flex items-center h-full space-x-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl h-80 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl h-80 shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading analytics data. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('analytics.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="last7Days">{t('analytics.last7Days')}</option>
            <option value="last30Days">{t('analytics.last30Days')}</option>
            <option value="last90Days">{t('analytics.last90Days')}</option>
            <option value="custom">{t('analytics.customRange')}</option>
          </select>
          <button
            onClick={exportReport}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>{t('analytics.exportReport')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: t('analytics.overview'), icon: ChartBarIcon },
            { id: 'users', label: t('analytics.userActivity'), icon: UsersIcon },
            { id: 'properties', label: t('analytics.propertyViews'), icon: HomeIcon },
            { id: 'revenue', label: t('analytics.revenueAnalysis'), icon: CurrencyEuroIcon },
            { id: 'trends', label: t('analytics.marketTrends'), icon: ArrowTrendingUpIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${selectedTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total Users', value: analyticsData.overview.totalUsers, icon: UsersIcon, color: 'blue' },
              { label: 'Properties', value: analyticsData.overview.totalProperties, icon: HomeIcon, color: 'green' },
              { label: 'Page Views', value: analyticsData.overview.totalViews.toLocaleString(), icon: EyeIcon, color: 'purple' },
              { label: 'Revenue', value: formatCurrency(analyticsData.overview.totalRevenue), icon: CurrencyEuroIcon, color: 'yellow' },
              { label: 'Conversion', value: formatPercentage(analyticsData.overview.conversionRate), icon: ArrowTrendingUpIcon, color: 'red' },
              { label: 'Avg Time', value: analyticsData.overview.avgTimeOnSite, icon: CalendarIcon, color: 'indigo' }
            ].map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className={`p-2 bg-${kpi.color}-100 dark:bg-${kpi.color}-900/20 rounded-lg`}>
                    <kpi.icon className={`h-6 w-6 text-${kpi.color}-600 dark:text-${kpi.color}-400`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{kpi.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* User Roles Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Distribution by Role
            </h3>
            <div className="space-y-3">
              {analyticsData.userActivity.byRole.map((role, index) => (
                <div key={role.role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-emerald-500' :
                        index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {role.role}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${index === 0 ? 'bg-emerald-500' :
                            index === 1 ? 'bg-green-500' :
                              index === 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        style={{ width: `${role.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                      {role.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Properties Tab */}
      {selectedTab === 'properties' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Properties by Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Properties by Type
              </h3>
              <div className="space-y-3">
                {analyticsData.propertyMetrics.byType.map((type) => (
                  <div key={type.type} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{type.type}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Avg: {formatCurrency(type.avgPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{type.count}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">properties</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Properties by Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Properties by Location
              </h3>
              <div className="space-y-3">
                {analyticsData.propertyMetrics.byLocation.map((location) => (
                  <div key={location.location} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{location.location}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Avg views: {location.avgViews}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{location.count}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">properties</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {selectedTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Source */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue by Source
              </h3>
              <div className="space-y-4">
                {analyticsData.revenue.bySource.map((source, index) => (
                  <div key={source.source} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {source.source}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(source.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${index === 0 ? 'bg-emerald-500' :
                            index === 1 ? 'bg-green-500' :
                              index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                          }`}
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Revenue Projections */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Projections
              </h3>
              <div className="space-y-3">
                {analyticsData.revenue.projections.map((projection) => (
                  <div key={projection.month} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {projection.month}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(projection.projected)}
                      </div>
                      {projection.actual && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Actual: {formatCurrency(projection.actual)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Market Trends Tab */}
      {selectedTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demand Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Market Demand Metrics
              </h3>
              <div className="space-y-4">
                {analyticsData.marketTrends.demandMetrics.map((metric) => (
                  <div key={metric.metric} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend)}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {metric.metric}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {typeof metric.value === 'number' && metric.value > 100
                        ? metric.value.toLocaleString()
                        : metric.value}
                      {metric.metric.includes('Rate') || metric.metric.includes('Volume') ? '%' : ''}
                      {metric.metric.includes('Time') ? ' days' : ''}
                      {metric.metric.includes('Price') ? ' €/m²' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Competitor Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Competitor Analysis
              </h3>
              <div className="space-y-3">
                {analyticsData.marketTrends.competitorAnalysis.map((competitor, index) => (
                  <div key={competitor.competitor} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${competitor.competitor === 'Ubica'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-700 dark:text-gray-300'
                        }`}>
                        {competitor.competitor}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {competitor.marketShare}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(competitor.avgPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${competitor.competitor === 'Ubica' ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        style={{ width: `${competitor.marketShare}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsComponent;
