import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WealthManagement from '../Dashboard/WealthManagement';
import {
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  HomeIcon,
  ChartBarIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  WalletIcon,
  MapPinIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import appService from '../../services';
import type { Property } from '../../types';

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

type Tab = 'overview' | 'portfolio' | 'opportunities' | 'wealth';

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

const MetricCard: React.FC<{ label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; color: string }> = ({ label, value, hint, icon: Icon, color }) => (
  <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center">
      <Icon className={`h-8 w-8 flex-shrink-0 ${color}`} />
      <dl className="ml-5 w-0 flex-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</dt>
        <dd className="text-2xl font-bold text-gray-900 dark:text-white">{value}</dd>
        {hint && <dd className="text-sm text-gray-500 dark:text-gray-400">{hint}</dd>}
      </dl>
    </div>
  </motion.div>
);

const InvestorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const tabs: { key: Tab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: 'overview', icon: ChartBarIcon, label: 'Resumen' },
    { key: 'portfolio', icon: HomeIcon, label: 'Mi Portfolio' },
    { key: 'opportunities', icon: ArrowTrendingUpIcon, label: 'Oportunidades' },
    { key: 'wealth', icon: WalletIcon, label: 'Patrimonio' },
  ];

  const propertyTitle = (row: InvestmentRow) => propertyById[row.property_id]?.title || `Inmueble #${row.property_id}`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Panel de Inversionista</h1>
        <p className="text-gray-600 dark:text-gray-400">Bienvenido de vuelta, {user?.full_name || 'inversor'}</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Secciones">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Valor del Portfolio" value={eur(stats.portfolio_value)} hint={`Invertido: ${eur(stats.total_investment)}`} icon={CurrencyEuroIcon} color="text-emerald-600" />
            <MetricCard label="Plusvalía latente" value={eur(stats.unrealized_gains)} hint={`Revalorización media ${pct(stats.appreciation_rate)}`} icon={ArrowTrendingUpIcon} color="text-emerald-600" />
            <MetricCard label="Ingresos por alquiler" value={eur(stats.monthly_income)} hint="Al mes" icon={BanknotesIcon} color="text-yellow-600" />
            <MetricCard label="ROI medio" value={pct(stats.average_roi)} hint={`Rentabilidad alquiler ${pct(stats.rental_yield)}`} icon={BuildingOfficeIcon} color="text-emerald-600" />
          </div>

          {portfolio.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 font-medium">Todavía no tienes inversiones registradas.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Cuando registremos una operación a tu nombre aparecerá aquí. Mientras tanto, echa un vistazo a las oportunidades.
              </p>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Ver oportunidades <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {market && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mercado en Ubica</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Calculado con los anuncios publicados en la plataforma</p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{market.total_properties ?? 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Inmuebles publicados</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{eur(market.average_price ?? 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Precio medio</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{market.cities?.length ?? 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Municipios con oferta</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Portfolio ({portfolio.length})</h2>
          {portfolio.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No tienes inversiones registradas.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {portfolio.map(row => {
                const prop = propertyById[row.property_id];
                const image = prop?.images?.[0];
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {image ? (
                      <img src={image} alt={propertyTitle(row)} className="w-full h-44 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-44 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <HomeIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{propertyTitle(row)}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 whitespace-nowrap">
                          {INVESTMENT_STATUS[row.status] || row.status}
                        </span>
                      </div>
                      {prop?.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" /> {prop.location}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Inversión</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{eur(row.investment_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Valor actual</p>
                          <p className="text-sm font-semibold text-emerald-600">{eur(row.current_value)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Alquiler anual</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{eur(row.annual_rental_income)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ROI</p>
                          <p className={`text-sm font-semibold ${row.roi_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(row.roi_percentage)}</p>
                        </div>
                      </div>
                      {row.purchase_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          Compra: {new Date(row.purchase_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      )}
                      {prop && (
                        <Link
                          to={`/property/${row.property_id}`}
                          className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          Ver inmueble
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Oportunidades en venta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Anuncios publicados actualmente en Ubica</p>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Ahora mismo no hay inmuebles en venta publicados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map(p => (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-44 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-44 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <HomeIcon className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">{p.title}</h3>
                    {p.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <MapPinIcon className="h-4 w-4" /> {p.location}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-emerald-600">{eur(p.price)}</span>
                      {p.area > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{p.area} m² · {eur(p.price / p.area)}/m²</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'wealth' && <WealthManagement />}
    </div>
  );
};

export default InvestorDashboard;
