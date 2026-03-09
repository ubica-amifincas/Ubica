import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  BanknotesIcon,
  KeyIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  HeartIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import MessagesPanel from '../../components/messaging/MessagesPanel';
import FavoritesPanel from '../../components/dashboard/FavoritesPanel';
import SavedSearchesPanel from '../../components/dashboard/SavedSearchesPanel';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const StatCard = ({ title, value, change, icon: Icon, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change !== undefined && (
            <p className={`text-sm font-medium mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% vs mes anterior
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'messages' | 'favorites' | 'searches'>('dashboard');
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();
  const location = useLocation();
  const navigate = useNavigate();

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'messages') setActiveView('messages');
    else if (view === 'favorites') setActiveView('favorites');
    else if (view === 'searches') setActiveView('searches');
    else setActiveView('dashboard');
  }, [location.search]);

  useEffect(() => {
    const loadUserDashboardData = async () => {
      setLoading(true);
      try {
        if (user?.role === 'user') {
          const [favs, searches, msgs] = await Promise.all([
            apiService.getFavorites(),
            apiService.getSearches(),
            apiService.getMessages()
          ]);
          setUserMetrics({
            favoritesCount: favs.length,
            searchesCount: searches.length,
            messagesCount: msgs.length,
          });
          return;
        }

        const userProperties = await apiService.getUserProperties();
        const totalValue = userProperties.reduce((sum, p) => sum + (p.totalCost || p.price || 0), 0);
        const rentedProperties = userProperties.filter(p => p.status === 'rented');
        const soldProperties = userProperties.filter(p => p.status === 'sold');
        const totalMonthlyIncome = userProperties.reduce((sum, p) => sum + (p.monthlyIncome || 0), 0);
        const totalMonthlyCost = userProperties.reduce((sum, p) => sum + (p.monthlyCost || 0), 0);
        const cashFlow = totalMonthlyIncome - totalMonthlyCost;
        const totalCost = userProperties.reduce((sum, p) => sum + (p.totalCost || p.price || 0), 0);
        const annualNetIncome = (totalMonthlyIncome - totalMonthlyCost) * 12;
        const avgROI = totalCost > 0 ? (annualNetIncome / totalCost) * 100 : 0;

        const typeGroups: Record<string, { count: number; totalRoi: number }> = {};
        userProperties.forEach(p => {
          const typeName = p.type || 'Otro';
          if (!typeGroups[typeName]) typeGroups[typeName] = { count: 0, totalRoi: 0 };
          typeGroups[typeName].count++;
          const propCost = p.totalCost || p.price || 1;
          const propAnnualNet = ((p.monthlyIncome || 0) - (p.monthlyCost || 0)) * 12;
          typeGroups[typeName].totalRoi += (propAnnualNet / propCost) * 100;
        });

        const msgs = await apiService.getMessages();
        const receivedMsgs = await apiService.getReceivedMessages();

        const metrics = {
          totalPortfolioValue: totalValue,
          monthlyIncome: totalMonthlyIncome,
          cashFlow,
          averageRoi: avgROI,
          messagesCount: msgs.length + receivedMsgs.length,
          revenueData: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map(month => ({
            month,
            sales: 0,
            rentals: Number((totalMonthlyIncome / 1000).toFixed(2))
          })),
          propertyTypeData: Object.entries(typeGroups).map(([name, data]) => ({
            name,
            value: data.count,
            roi: Number((data.totalRoi / data.count).toFixed(2))
          }))
        };
        setUserMetrics(metrics);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback for metrics to prevent infinite spinner
        setUserMetrics({
          favoritesCount: 0,
          searchesCount: 0,
          messagesCount: 0,
          totalPortfolioValue: 0,
          monthlyIncome: 0,
          cashFlow: 0,
          averageRoi: 0,
          revenueData: [],
          propertyTypeData: []
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) loadUserDashboardData();
  }, [user, apiService]);

  const renderUserDashboard = () => (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hola {user?.full_name || 'Usuario'}, bienvenido a tu espacio web.
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Usa este panel para encontrar tus próximas propiedades.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tus Favoritos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 w-max rounded-lg mb-4">
              <HeartIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tus Favoritos</h3>
            <p className="text-gray-500 text-sm mb-4">
              {userMetrics.favoritesCount > 0
                ? `Tienes ${userMetrics.favoritesCount} propiedades marcadas como favoritas.`
                : 'Aún no tienes propiedades guardadas.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard?view=favorites')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 text-left border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
          >
            Explorar listado →
          </button>
        </div>

        {/* Búsquedas Guardadas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 w-max rounded-lg mb-4">
              <MagnifyingGlassIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Búsquedas Guardadas</h3>
            <p className="text-gray-500 text-sm mb-4">
              {userMetrics.searchesCount > 0
                ? `Tienes ${userMetrics.searchesCount} alertas configuradas.`
                : 'Guarda tus criterios de búsqueda para recibir notificaciones.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard?view=searches')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 text-left border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
          >
            Ver todas →
          </button>
        </div>

        {/* Mensajes Inmobiliarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 w-max rounded-lg mb-4">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Mensajes Inmobiliarios</h3>
            <p className="text-gray-500 text-sm mb-4">
              {userMetrics.messagesCount > 0
                ? `Tienes ${userMetrics.messagesCount} conversaciones activas.`
                : 'Consulta el estado de tus solicitudes de información.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard?view=messages')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 text-left border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
          >
            Mis mensajes →
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Resumen General</h1>
        <p className="text-gray-600 dark:text-gray-400">Resumen general de tu portafolio inmobiliario en Murcia</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Valor Portafolio" value={new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(userMetrics.totalPortfolioValue)} icon={BuildingOfficeIcon} color="blue" />
        <StatCard title="Ingresos Mensuales" value={new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(userMetrics.monthlyIncome)} icon={BanknotesIcon} color="green" />
        <StatCard title="Cash Flow Neto" value={new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(userMetrics.cashFlow)} icon={ArrowTrendingUpIcon} color="purple" />
        <StatCard title="ROI Medio" value={`${userMetrics.averageRoi.toFixed(1)}%`} icon={ChartBarIcon} color="orange" />
      </div>

      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg">
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mensajes y Consultas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tienes {userMetrics.messagesCount} mensajes nuevos.</p>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard?view=messages')} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
          Ver Mensajes
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rendimiento</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userMetrics.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB' }} />
              <Line type="monotone" dataKey="rentals" stroke="#10B981" strokeWidth={2} name="Alquileres" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={userMetrics.propertyTypeData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {userMetrics.propertyTypeData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Solo bloqueamos si estamos en la vista de resumen y todavía está cargando
  if (loading && activeView === 'dashboard') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const renderViewContent = () => {
    switch (activeView) {
      case 'messages':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centro de Mensajes</h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
                Volver al Dashboard
              </button>
            </div>
            <MessagesPanel />
          </div>
        );
      case 'favorites':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Favoritos</h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
                Volver al Dashboard
              </button>
            </div>
            <FavoritesPanel />
          </div>
        );
      case 'searches':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Búsquedas Guardadas</h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
                Volver al Dashboard
              </button>
            </div>
            <SavedSearchesPanel />
          </div>
        );
      default:
        return user?.role === 'user' ? renderUserDashboard() : renderDashboard();
    }
  };

  return renderViewContent();
}
