
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import UserManagement from '../../components/admin/UserManagement';
import PropertyManagement from '../../components/admin/PropertyManagement';
import SecuritySettings from '../../components/admin/SecuritySettings';
import EnhancedCustomizationSettings from '../../components/admin/EnhancedCustomizationSettings';
import MFASettings from '../../components/admin/MFASettings';
import SystemLogs from '../../components/admin/SystemLogs';
import Analytics from '../../components/admin/Analytics';
import { useLanguage } from '../../hooks/useLanguage';
import {
  UsersIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  ShieldCheckIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  ChartPieIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  overview: {
    total_users: number;
    total_properties: number;
    total_investments: number;
    total_transactions: number;
    total_property_value: number;
    users_by_role: Record<string, number>;
    properties_by_status: Record<string, number>;
  };
  revenue: {
    total_transaction_value: number;
    total_commissions: number;
    platform_revenue: number;
    transaction_count: number;
  };
  user_growth: Array<{
    month: string;
    new_users: number;
  }>;
  top_properties: Array<{
    id: number;
    title: string;
    views: number;
    price: number;
    city: string;
  }>;
  top_realtors: Array<{
    id: number;
    name: string;
    company: string;
    properties: number;
  }>;
}

type TabType = 'dashboard' | 'users' | 'properties' | 'analytics' | 'security' | 'customization' | 'mfa' | 'logs';

const TABS = [
  { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
  { id: 'users', name: 'Usuarios', icon: UsersIcon },
  { id: 'properties', name: 'Propiedades', icon: BuildingOfficeIcon },
  { id: 'analytics', name: 'Analytics', icon: ChartPieIcon },
  { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
  { id: 'customization', name: 'Personalización', icon: PaintBrushIcon },
  { id: 'mfa', name: 'MFA', icon: KeyIcon },
  { id: 'logs', name: 'Registros', icon: DocumentTextIcon },
];

const AdminDashboard: React.FC = () => {
  console.log('🚀 AdminDashboard with TABS is loading!');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await authenticatedFetch.getAdminDashboard();
      setDashboardData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const renderDashboard = () => {
    if (!dashboardData) return <div>No hay datos disponibles</div>;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Administrativo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visión general de la plataforma Ubica
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <UsersIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(dashboardData.overview.total_users)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-xl">
                <BuildingOfficeIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Propiedades</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(dashboardData.overview.total_properties)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-xl">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(dashboardData.overview.total_transactions)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ArrowTrendingUpIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dashboardData.overview.total_property_value)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribución de usuarios y propiedades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Usuarios por Rol
            </h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.overview.users_by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {role === 'admin' ? 'Administradores' :
                      role === 'realtor' ? 'Inmobiliarias' :
                        role === 'investor' ? 'Inversionistas' : 'Usuarios'}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Propiedades por Estado
            </h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.overview.properties_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {status === 'available' ? 'Disponibles' :
                      status === 'sold' ? 'Vendidas' :
                        status === 'rented' ? 'Alquiladas' : status}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ingresos y comisiones */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Análisis Financiero
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Transacciones</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dashboardData.revenue.total_transaction_value)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Comisiones Totales</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dashboardData.revenue.total_commissions)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos Plataforma</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dashboardData.revenue.platform_revenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Top propiedades e inmobiliarias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Propiedades Más Vistas
            </h3>
            <div className="space-y-3">
              {dashboardData.top_properties.map((property) => (
                <div key={property.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {property.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {property.city} - {formatCurrency(property.price)}
                    </p>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm">{property.views}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Inmobiliarias
            </h3>
            <div className="space-y-3">
              {dashboardData.top_realtors.map((realtor) => (
                <div key={realtor.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {realtor.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {realtor.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {realtor.properties}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">propiedades</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return <UserManagement />;
      case 'properties':
        return <PropertyManagement />;
      case 'analytics':
        return <Analytics />;
      case 'security':
        return <SecuritySettings />;
      case 'customization':
        return <EnhancedCustomizationSettings />;
      case 'mfa':
        return <MFASettings />;
      case 'logs':
        return <SystemLogs />;
      default:
        return renderDashboard();
    }
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && activeTab === 'dashboard') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6" />
            </span>
            Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestiona la configuración global, cuentas y activos de la plataforma.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide pb-2" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`${isActive
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } flex items-center space-x-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderTabContent()}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
