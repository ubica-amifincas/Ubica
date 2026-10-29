import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KeyIcon, BanknotesIcon, HomeIcon } from '@heroicons/react/24/outline';
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

  const header = <PageHeader title={t('dashboard.rentals')} description="Tus propiedades alquiladas y en alquiler" />;

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  const rented = properties.filter(p => p.status === 'rented');
  const forRent = properties.filter(p => p.status === 'for-rent');
  const monthlyIncome = rented.reduce((sum, p) => sum + (p.monthlyIncome || 0), 0);
  const rentable = rented.length + forRent.length;
  const occupancy = rentable > 0 ? Math.round((rented.length / rentable) * 100) : null;

  return (
    <PageStack>
      {header}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <StatGrid cols={3}>
        <StatCard label="Propiedades alquiladas" value={rented.length} icon={KeyIcon} />
        <StatCard label="Ingresos mensuales" value={eur(monthlyIncome)} hint="Según los ingresos que has indicado" icon={BanknotesIcon} />
        <StatCard
          label="Ocupación"
          value={occupancy === null ? '—' : `${occupancy} %`}
          hint={`${rented.length} de ${rentable} destinadas a alquiler`}
          icon={HomeIcon}
        />
      </StatGrid>

      <Section title="Propiedades alquiladas" flush>
        {rented.length === 0 ? (
          <EmptyState bare icon={KeyIcon} title="No tienes propiedades marcadas como alquiladas." />
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {rented.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="min-w-0">
                  <Link to={`/property/${p.id}`} className="block truncate font-medium text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                    {p.title}
                  </Link>
                  {p.location && <p className="text-sm text-gray-600 dark:text-gray-400">{p.location}</p>}
                </div>
                <p className="whitespace-nowrap text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                  {p.monthlyIncome ? `${eur(p.monthlyIncome)}/mes` : '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageStack>
  );
}
