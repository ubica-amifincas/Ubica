import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowTrendingUpIcon, BanknotesIcon, CalculatorIcon } from '@heroicons/react/24/outline';
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

/** Rentabilidad neta anual de una propiedad a partir de los datos financieros que introdujo su propietario. */
function propertyRoi(p: Property): number | null {
  const cost = p.totalCost || p.purchasePrice || 0;
  if (cost <= 0 || !(p.monthlyIncome || p.monthlyCost)) return null;
  return (((p.monthlyIncome || 0) - (p.monthlyCost || 0)) * 12 / cost) * 100;
}

export default function DashboardInvestments() {
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
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus inversiones.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, apiService]);

  const header = (
    <PageHeader
      title={t('dashboard.investments')}
      description="Rentabilidad calculada con el coste, los ingresos y los gastos que has indicado en tus propiedades"
    />
  );

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  // Solo cuentan las propiedades con coste y rentas/gastos informados
  const withData = properties
    .map(p => ({ property: p, roi: propertyRoi(p) }))
    .filter((x): x is { property: Property; roi: number } => x.roi !== null);

  const totalCost = withData.reduce((s, x) => s + (x.property.totalCost || x.property.purchasePrice || 0), 0);
  const annualNet = withData.reduce((s, x) => s + ((x.property.monthlyIncome || 0) - (x.property.monthlyCost || 0)) * 12, 0);
  const weightedRoi = totalCost > 0 ? (annualNet / totalCost) * 100 : 0;

  const byType: Record<string, { total: number; count: number }> = {};
  withData.forEach(({ property, roi }) => {
    const key = property.type || 'otro';
    byType[key] = byType[key] || { total: 0, count: 0 };
    byType[key].total += roi;
    byType[key].count += 1;
  });
  const roiData = Object.entries(byType).map(([propertyType, d]) => ({
    propertyType,
    averageROI: Number((d.total / d.count).toFixed(2)),
  }));

  return (
    <PageStack>
      {header}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <StatGrid cols={3}>
        <StatCard label="Rentabilidad neta media" value={withData.length ? `${weightedRoi.toFixed(1)} %` : '—'} icon={ArrowTrendingUpIcon} />
        <StatCard label="Flujo neto anual" value={eur(annualNet)} icon={BanknotesIcon} />
        <StatCard label="Propiedades con datos" value={`${withData.length} / ${properties.length}`} icon={CalculatorIcon} tone="neutral" />
      </StatGrid>

      {withData.length === 0 ? (
        <EmptyState
          icon={CalculatorIcon}
          title="Aún no hay datos para calcular la rentabilidad"
          description={
            <>
              Indica el coste total y los ingresos o gastos mensuales en{' '}
              <Link to="/dashboard/properties" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">tus propiedades</Link>{' '}
              para ver aquí su rentabilidad.
            </>
          }
        />
      ) : (
        <>
          {roiData.length > 1 && (
            <Section title="Rentabilidad media por tipo de propiedad (%)">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={roiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" opacity={0.3} />
                  <XAxis dataKey="propertyType" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }}
                  />
                  <Bar dataKey="averageROI" name="Rentabilidad %" fill="#0f6b4f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          <Section title="Detalle por propiedad" flush>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {withData
                .sort((a, b) => b.roi - a.roi)
                .map(({ property: p, roi }) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-white">{p.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Coste {eur(p.totalCost || p.purchasePrice || 0)} · {eur((p.monthlyIncome || 0) - (p.monthlyCost || 0))}/mes netos
                      </p>
                    </div>
                    <p className={`whitespace-nowrap font-display text-lg font-semibold tabular-nums ${roi >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                      {roi.toFixed(1)} %
                    </p>
                  </li>
                ))}
            </ul>
          </Section>
        </>
      )}
    </PageStack>
  );
}
