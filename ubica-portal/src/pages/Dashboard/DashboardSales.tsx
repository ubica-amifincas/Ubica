import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BanknotesIcon, ArrowTrendingUpIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';
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

  const header = <PageHeader title={t('dashboard.sales')} description="Tus propiedades marcadas como vendidas" />;

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  const totalValue = sold.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <PageStack>
      {header}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <StatGrid cols={3}>
        <StatCard label="Propiedades vendidas" value={sold.length} icon={BanknotesIcon} />
        <StatCard label="Importe de las ventas" value={eur(totalValue)} hint="Según el precio publicado" icon={ArrowTrendingUpIcon} />
        <StatCard label="Aún en venta" value={forSale} icon={BuildingOfficeIcon} tone="neutral" />
      </StatGrid>

      <Section title="Propiedades vendidas" flush>
        {sold.length === 0 ? (
          <EmptyState bare icon={BanknotesIcon} title="Aún no tienes propiedades marcadas como vendidas." />
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {sold.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="min-w-0">
                  <Link to={`/property/${p.id}`} className="block truncate font-medium text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                    {p.title}
                  </Link>
                  {p.location && <p className="text-sm text-gray-600 dark:text-gray-400">{p.location}</p>}
                </div>
                <p className="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white">{eur(p.price)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageStack>
  );
}
