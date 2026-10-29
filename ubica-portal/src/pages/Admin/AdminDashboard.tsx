import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import UserManagement from '../../components/admin/UserManagement';
import PropertyManagement from '../../components/admin/PropertyManagement';
import type { AdminDashboardStats } from '../../services/apiService';
import { getStatusLabelPlural } from '../../utils/propertyStatus';
import {
  UsersIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  Cog6ToothIcon,
  KeyIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

type TabType = 'dashboard' | 'users' | 'properties';

const TABS: { id: TabType; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
  { id: 'users', name: 'Usuarios', icon: UsersIcon },
  { id: 'properties', name: 'Propiedades', icon: BuildingOfficeIcon },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradores',
  realtor: 'Inmobiliarias',
  investor: 'Inversores',
  user: 'Usuarios',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount || 0);

const formatNumber = (num: number) => new Intl.NumberFormat('es-ES').format(num || 0);

const StatCard: React.FC<{ label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = ({ label, value, icon: Icon, tone }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="flex items-center">
      <div className={`p-3 rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

const DistributionCard: React.FC<{ title: string; entries: [string, number][]; total: number; empty: string }> = ({ title, entries, total, empty }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
    {entries.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
    ) : (
      <div className="space-y-4">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatNumber(count)} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const api = useAuthenticatedFetch();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setStats(await api.getAdminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchDashboardData} className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline">
            Reintentar
          </button>
        </div>
      );
    }
    if (!stats) return <div className="text-gray-500 dark:text-gray-400">No hay datos disponibles</div>;

    const roleEntries: [string, number][] = Object.entries(stats.users_by_role || {})
      .map(([role, n]) => [ROLE_LABELS[role] || role, Number(n) || 0] as [string, number]);
    const statusEntries: [string, number][] = Object.entries(stats.properties_by_status || {})
      .map(([status, n]) => [getStatusLabelPlural(status), Number(n) || 0] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Administrativo</h2>
          <p className="text-gray-600 dark:text-gray-400">Datos reales de la plataforma Ubica</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Usuarios" value={formatNumber(stats.total_users)} icon={UsersIcon} tone="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Propiedades" value={formatNumber(stats.total_properties)} icon={BuildingOfficeIcon} tone="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" />
          <StatCard label="Inversiones registradas" value={formatNumber(stats.total_transactions)} icon={BanknotesIcon} tone="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400" />
          <StatCard label="Capital invertido" value={formatCurrency(stats.total_revenue)} icon={ArrowTrendingUpIcon} tone="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Vendidas este mes" value={formatNumber(stats.properties_sold_this_month ?? 0)} icon={CheckBadgeIcon} tone="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" />
          <StatCard label="Alquiladas este mes" value={formatNumber(stats.properties_rented_this_month ?? 0)} icon={KeyIcon} tone="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" />
          <StatCard label="ROI medio de inversiones" value={`${(stats.average_roi ?? 0).toFixed(1)} %`} icon={ChartBarIcon} tone="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionCard title="Usuarios por Rol" entries={roleEntries} total={stats.total_users} empty="Sin usuarios registrados." />
          <DistributionCard title="Propiedades por Estado" entries={statusEntries} total={stats.total_properties} empty="Sin propiedades publicadas." />
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'properties':
        return <PropertyManagement />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6" />
            </span>
            Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestiona las cuentas y las propiedades de la plataforma.
          </p>
        </div>
      </div>

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
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
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
