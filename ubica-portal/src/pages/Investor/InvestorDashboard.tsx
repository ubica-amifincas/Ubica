import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WealthManagement from '../Dashboard/WealthManagement';
import {
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import appService from '../../services';
import type { Property } from '../../types';
import {
  PageHeader,
  PageStack,
  Section,
  Card,
  StatCard,
  StatGrid,
  EmptyState,
  LoadingState,
  ErrorAlert,
  Badge,
  buttonClass,
  PropertyImage,
} from '../../components/dashboard/ui';

/** Respuesta de GET /investor/dashboard (calculada a partir de las inversiones del usuario). */
interface InvestorStats {
  portfolio_value: number;
  total_properties: number;
  monthly_income: number;
  average_roi: number;
  total_investment: number;
  unrealized_gains: number;
  rental_yield: number;
  appreciation_rate: number;
}

/** Fila de GET /investor/portfolio. */
interface InvestmentRow {
  id: number;
  property_id: number;
  investment_amount: number;
  current_value: number;
  purchase_price: number;
  purchase_date: string;
  roi_percentage: number;
  annual_rental_income: number;
  rental_yield: number;
  appreciation_rate: number;
  holding_period_months: number;
  status: string;
}

interface MarketStats {
  total_properties?: number;
  average_price?: number;
  cities?: string[];
}

export type InvestorSection = 'overview' | 'portfolio' | 'opportunities' | 'wealth';

const EMPTY_STATS: InvestorStats = {
  portfolio_value: 0,
  total_properties: 0,
  monthly_income: 0,
  average_roi: 0,
  total_investment: 0,
  unrealized_gains: 0,
  rental_yield: 0,
  appreciation_rate: 0,
};

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (n: number) => `${(n || 0).toFixed(1)} %`;

const INVESTMENT_STATUS: Record<string, string> = {
  active: 'Activa',
  sold: 'Vendida',
  pending: 'Pendiente',
};

/**
 * Panel del inversor. La sección activa la decide la ruta
 * (/investor, /investor/portfolio, /investor/oportunidades, /investor/patrimonio).
 */
const InvestorDashboard: React.FC<{ section?: InvestorSection }> = ({ section = 'overview' }) => {
  const [stats, setStats] = useState<InvestorStats>(EMPTY_STATS);
  const [portfolio, setPortfolio] = useState<InvestmentRow[]>([]);
  const [propertyById, setPropertyById] = useState<Record<number, Property>>({});
  const [opportunities, setOpportunities] = useState<Property[]>([]);
  const [market, setMarket] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [dashboard, rows] = await Promise.all([
          appService.getInvestorDashboard() as Promise<InvestorStats>,
          appService.getInvestorPortfolio() as Promise<InvestmentRow[]>,
        ]);
        if (cancelled) return;
        setStats({ ...EMPTY_STATS, ...dashboard });
        setPortfolio(Array.isArray(rows) ? rows : []);

        // Datos públicos de los inmuebles de cada inversión (título, ciudad, foto)
        const ids = [...new Set((rows || []).map(r => r.property_id))];
        const results = await Promise.allSettled(ids.map(id => appService.getProperty(id)));
        if (cancelled) return;
        const map: Record<number, Property> = {};
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value) map[r.value.id] = r.value;
        });
        setPropertyById(map);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar tus inversiones.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Oportunidades: anuncios públicos en venta; y resumen real del mercado
    appService.getProperties(0, 60)
      .then(list => {
        if (!cancelled) setOpportunities(list.filter(p => p.status === 'for-sale').slice(0, 6));
      })
      .catch(() => { /* sección opcional */ });
    appService.getMarketStats()
      .then(m => { if (!cancelled) setMarket(m); })
      .catch(() => { /* sección opcional */ });

    load();
    return () => { cancelled = true; };
  }, []);

  // Patrimonio es la misma herramienta que /dashboard/wealth, con su propia cabecera
  if (section === 'wealth') return <WealthManagement />;

  const headers: Record<Exclude<InvestorSection, 'wealth'>, { title: string; description?: string }> = {
    overview: { title: 'Panel de inversionista', description: `Bienvenido de vuelta, ${user?.full_name || 'inversor'}` },
    portfolio: { title: `Mi portfolio (${portfolio.length})`, description: 'Inversiones registradas a tu nombre' },
    opportunities: { title: 'Oportunidades en venta', description: 'Anuncios publicados actualmente en Ubica' },
  };
  const header = <PageHeader {...headers[section]} />;

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  const propertyTitle = (row: InvestmentRow) => propertyById[row.property_id]?.title || `Inmueble #${row.property_id}`;

  return (
    <PageStack>
      {header}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {section === 'overview' && (
        <>
          <StatGrid cols={4}>
            <StatCard label="Valor del portfolio" value={eur(stats.portfolio_value)} hint={`Invertido: ${eur(stats.total_investment)}`} icon={CurrencyEuroIcon} />
            <StatCard label="Plusvalía latente" value={eur(stats.unrealized_gains)} hint={`Revalorización media ${pct(stats.appreciation_rate)}`} icon={ArrowTrendingUpIcon} />
            <StatCard label="Ingresos por alquiler" value={eur(stats.monthly_income)} hint="Al mes" icon={BanknotesIcon} />
            <StatCard label="ROI medio" value={pct(stats.average_roi)} hint={`Rentabilidad alquiler ${pct(stats.rental_yield)}`} icon={BuildingOfficeIcon} />
          </StatGrid>

          {portfolio.length === 0 && (
            <EmptyState
              icon={BriefcaseIcon}
              title="Todavía no tienes inversiones registradas."
              description="Cuando registremos una operación a tu nombre aparecerá aquí. Mientras tanto, echa un vistazo a las oportunidades."
              action={
                <Link to="/investor/oportunidades" className={buttonClass.primary}>
                  Ver oportunidades <ArrowRightIcon className="h-4 w-4" />
                </Link>
              }
            />
          )}

          {market && (
            <Section title="Mercado en Ubica" description="Calculado con los anuncios publicados en la plataforma">
              <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                {[
                  ['Inmuebles publicados', String(market.total_properties ?? 0)],
                  ['Precio medio', eur(market.average_price ?? 0)],
                  ['Municipios con oferta', String(market.cities?.length ?? 0)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {section === 'portfolio' && (
        portfolio.length === 0 ? (
          <EmptyState
            icon={BriefcaseIcon}
            title="No tienes inversiones registradas."
            action={<Link to="/investor/oportunidades" className={buttonClass.secondary}>Ver oportunidades</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {portfolio.map(row => {
              const prop = propertyById[row.property_id];
              const image = prop?.images?.[0];
              return (
                <Card key={row.id} className="flex flex-col overflow-hidden">
                  <PropertyImage src={image} alt={propertyTitle(row)} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{propertyTitle(row)}</h3>
                      <Badge tone={row.status === 'active' ? 'brand' : row.status === 'pending' ? 'warning' : 'neutral'}>
                        {INVESTMENT_STATUS[row.status] || row.status}
                      </Badge>
                    </div>
                    {prop?.location && (
                      <p className="mb-4 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4" /> {prop.location}
                      </p>
                    )}
                    <dl className="mb-4 grid grid-cols-2 gap-4">
                      {[
                        ['Inversión', eur(row.investment_amount), ''],
                        ['Valor actual', eur(row.current_value), ''],
                        ['Alquiler anual', eur(row.annual_rental_income), ''],
                        ['ROI', pct(row.roi_percentage), row.roi_percentage >= 0 ? '' : 'text-red-600 dark:text-red-400'],
                      ].map(([label, value, tone]) => (
                        <div key={label}>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
                          <dd className={`text-sm font-semibold tabular-nums ${tone || 'text-gray-900 dark:text-white'}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {row.purchase_date && (
                      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                        Compra: {new Date(row.purchase_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {prop && (
                      <Link to={`/property/${row.property_id}`} className={`${buttonClass.secondary} mt-auto w-full`}>
                        Ver inmueble
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {section === 'opportunities' && (
        opportunities.length === 0 ? (
          <EmptyState icon={LightBulbIcon} title="Ahora mismo no hay inmuebles en venta publicados." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {opportunities.map(p => (
              <Link
                key={p.id}
                to={`/property/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-emerald-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
              >
                <PropertyImage src={p.images?.[0]} alt={p.title} />
                <div className="p-5">
                  <p className="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{eur(p.price)}</p>
                  <h3 className="mt-1 font-medium text-gray-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">{p.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {p.location && (
                      <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4" /> {p.location}
                      </p>
                    )}
                    {p.area > 0 && (
                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{p.area} m² · {eur(p.price / p.area)}/m²</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </PageStack>
  );
};

export default InvestorDashboard;
