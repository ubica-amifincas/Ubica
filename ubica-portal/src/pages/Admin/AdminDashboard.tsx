import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import UserManagement from '../../components/admin/UserManagement';
import PropertyManagement from '../../components/admin/PropertyManagement';
import type { AdminDashboardStats } from '../../services/apiService';
import { getStatusLabelPlural } from '../../utils/propertyStatus';
import {
  PageHeader,
  PageStack,
  Section,
  StatCard,
  StatGrid,
  EmptyState,
  LoadingState,
  ErrorAlert,
} from '../../components/dashboard/ui';
import {
  UsersIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  KeyIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

export type AdminSection = 'overview' | 'users' | 'properties';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradores',
  realtor: 'Inmobiliarias',
  investor: 'Inversores',
  user: 'Usuarios',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount || 0);

const formatNumber = (num: number) => new Intl.NumberFormat('es-ES').format(num || 0);

const DistributionCard: React.FC<{ title: string; entries: [string, number][]; total: number; empty: string }> = ({ title, entries, total, empty }) => (
  <Section title={title}>
    {entries.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
    ) : (
      <div className="space-y-4">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatNumber(count)} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Section>
);

const AdminOverview: React.FC = () => {
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

  const header = <PageHeader title="Panel de administración" description="Datos reales de la plataforma Ubica" />;

  if (loading) return <PageStack>{header}<LoadingState /></PageStack>;
  if (error) return <PageStack>{header}<ErrorAlert onRetry={fetchDashboardData}>{error}</ErrorAlert></PageStack>;
  if (!stats) return <PageStack>{header}<EmptyState icon={ChartBarIcon} title="No hay datos disponibles" /></PageStack>;

  const roleEntries: [string, number][] = Object.entries(stats.users_by_role || {})
    .map(([role, n]) => [ROLE_LABELS[role] || role, Number(n) || 0] as [string, number]);
  const statusEntries: [string, number][] = Object.entries(stats.properties_by_status || {})
    .map(([status, n]) => [getStatusLabelPlural(status), Number(n) || 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <PageStack>
      {header}

      <StatGrid cols={4}>
        <StatCard label="Total usuarios" value={formatNumber(stats.total_users)} icon={UsersIcon} />
        <StatCard label="Propiedades" value={formatNumber(stats.total_properties)} icon={BuildingOfficeIcon} />
        <StatCard label="Inversiones registradas" value={formatNumber(stats.total_transactions)} icon={BanknotesIcon} />
        <StatCard label="Capital invertido" value={formatCurrency(stats.total_revenue)} icon={ArrowTrendingUpIcon} />
      </StatGrid>

      <StatGrid cols={3}>
        <StatCard label="Vendidas este mes" value={formatNumber(stats.properties_sold_this_month ?? 0)} icon={CheckBadgeIcon} tone="neutral" />
        <StatCard label="Alquiladas este mes" value={formatNumber(stats.properties_rented_this_month ?? 0)} icon={KeyIcon} tone="neutral" />
        <StatCard label="ROI medio de inversiones" value={`${(stats.average_roi ?? 0).toFixed(1)} %`} icon={ChartBarIcon} tone="neutral" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DistributionCard title="Usuarios por rol" entries={roleEntries} total={stats.total_users} empty="Sin usuarios registrados." />
        <DistributionCard title="Propiedades por estado" entries={statusEntries} total={stats.total_properties} empty="Sin propiedades publicadas." />
      </div>
    </PageStack>
  );
};

/** Panel de administración. La sección la decide la ruta (/admin, /admin/usuarios, /admin/propiedades). */
const AdminDashboard: React.FC<{ section?: AdminSection }> = ({ section = 'overview' }) => {
  switch (section) {
    case 'users':
      return <UserManagement />;
    case 'properties':
      return <PropertyManagement />;
    default:
      return <AdminOverview />;
  }
};

export default AdminDashboard;
