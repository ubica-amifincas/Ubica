import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { panelHome } from '../../utils/panelHome';
import {
  BuildingOfficeIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import MessagesPanel from '../../components/messaging/MessagesPanel';
import FavoritesPanel from '../../components/dashboard/FavoritesPanel';
import SavedSearchesPanel from '../../components/dashboard/SavedSearchesPanel';
import { AIHistoryPanel } from '../../components/dashboard/AIHistoryPanel';
import {
  PageHeader,
  PageStack,
  Section,
  Card,
  StatCard,
  StatGrid,
  LoadingState,
  EmptyState,
  buttonClass,
} from '../../components/dashboard/ui';

type IconType = React.ComponentType<{ className?: string }>;

/** Acceso directo del resumen del usuario: icono, texto y enlace a la sección del panel. */
const ShortcutCard = ({
  icon: Icon,
  title,
  text,
  to,
  cta,
  className = '',
}: {
  icon: IconType;
  title: string;
  text: string;
  to: string;
  cta: string;
  className?: string;
}) => (
  <Card className={`flex flex-col p-5 ${className}`}>
    <div className="mb-4 w-max rounded-lg bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
    <Link
      to={to}
      className="mt-4 inline-flex items-center gap-1 border-t border-gray-200 pt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:border-gray-700 dark:text-emerald-300 dark:hover:text-emerald-200"
    >
      {cta} <ArrowRightIcon className="h-4 w-4" />
    </Link>
  </Card>
);

const eurFull = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'messages' | 'favorites' | 'searches' | 'ia_history'>('dashboard');
  const { t } = useLanguage();
  const { user } = useAuth();
  const apiService = useAuthenticatedFetch();
  const location = useLocation();

  // Verde Ubica en varios tonos, ámbar y gris: sin azules ni violetas
  const COLORS = ['#357186', '#62ab9f', '#c2e6c6', '#d97706', '#6b7280'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'messages') setActiveView('messages');
    else if (view === 'favorites') setActiveView('favorites');
    else if (view === 'searches') setActiveView('searches');
    else if (view === 'ia_history') setActiveView('ia_history');
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
    <PageStack>
      <PageHeader
        title={`Hola, ${user?.full_name || 'usuario'}`}
        description="Bienvenido a tu espacio. Usa este panel para encontrar tus próximas propiedades."
      />

      {/* Tus consultas IA */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-lg bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tus consultas IA</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              Retoma tus conversaciones con el asistente virtual de AMI Fincas. Repasa tus cálculos de rentabilidad, visitas agendadas o dudas sobre nuestro servicio.
            </p>
          </div>
        </div>
        <Link to="/dashboard?view=ia_history" className={`${buttonClass.primary} flex-shrink-0`}>
          Ver historial
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ShortcutCard
          icon={HeartIcon}
          title="Tus favoritos"
          text={userMetrics.favoritesCount > 0
            ? `Tienes ${userMetrics.favoritesCount} propiedades marcadas como favoritas.`
            : 'Aún no tienes propiedades guardadas.'}
          to="/dashboard?view=favorites"
          cta="Explorar listado"
        />
        <ShortcutCard
          icon={MagnifyingGlassIcon}
          title="Búsquedas guardadas"
          text={userMetrics.searchesCount > 0
            ? `Tienes ${userMetrics.searchesCount} alertas configuradas.`
            : 'Guarda tus criterios de búsqueda para recibir notificaciones.'}
          to="/dashboard?view=searches"
          cta="Ver todas"
        />
        <ShortcutCard
          icon={ChatBubbleLeftRightIcon}
          title="Mensajes inmobiliarios"
          text={userMetrics.messagesCount > 0
            ? `Tienes ${userMetrics.messagesCount} conversaciones activas con agentes o de propiedades.`
            : 'Consulta el estado de tus solicitudes de información hacia las agencias de AMI Fincas.'}
          to="/dashboard?view=messages"
          cta="Ir al buzón"
          className="md:col-span-2"
        />
      </div>
    </PageStack>
  );

  const renderDashboard = () => (
    <PageStack>
      <PageHeader title="Resumen financiero" description="Resumen general de tu portafolio inmobiliario en Murcia" />

      <StatGrid cols={4}>
        <StatCard label="Valor portafolio" value={eurFull(userMetrics.totalPortfolioValue)} icon={BuildingOfficeIcon} />
        <StatCard label="Ingresos mensuales" value={eurFull(userMetrics.monthlyIncome)} icon={BanknotesIcon} />
        <StatCard label="Cash flow neto" value={eurFull(userMetrics.cashFlow)} icon={ArrowTrendingUpIcon} />
        <StatCard label="ROI medio" value={`${userMetrics.averageRoi.toFixed(1)}%`} icon={ChartBarIcon} />
      </StatGrid>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Mensajes y consultas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tienes {userMetrics.messagesCount} mensajes nuevos.</p>
          </div>
        </div>
        <Link to="/dashboard?view=messages" className={buttonClass.primary}>
          Ver mensajes
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Rendimiento">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userMetrics.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" opacity={0.3} />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB', borderRadius: 8, border: 'none' }} />
              <Line type="monotone" dataKey="rentals" stroke="#357186" strokeWidth={2} name="Alquileres" />
            </LineChart>
          </ResponsiveContainer>
        </Section>
        <Section title="Distribución">
          {userMetrics.propertyTypeData.length === 0 ? (
            <EmptyState bare icon={BuildingOfficeIcon} title="Aún no hay propiedades que repartir por tipo." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={userMetrics.propertyTypeData} cx="50%" cy="50%" outerRadius={80} fill="#357186" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {userMetrics.propertyTypeData.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', color: '#F9FAFB', borderRadius: 8, border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>
    </PageStack>
  );

  // Admin, inmobiliaria e inversor tienen su propio resumen; aquí solo entran a mensajes o historial IA
  const home = panelHome(user?.role);
  if (home !== '/dashboard' && !new URLSearchParams(location.search).get('view')) {
    return <Navigate to={home} replace />;
  }

  // Solo bloqueamos si estamos en la vista de resumen y todavía está cargando
  if (loading && activeView === 'dashboard') {
    return <LoadingState />;
  }

  const renderViewContent = () => {
    switch (activeView) {
      case 'messages':
        return (
          <PageStack>
            <PageHeader title="Centro de mensajes" description="Tus conversaciones con agencias y propietarios" />
            <MessagesPanel />
          </PageStack>
        );
      case 'favorites':
        return (
          <PageStack>
            <PageHeader title="Mis favoritos" description="Las propiedades que has guardado" />
            <FavoritesPanel />
          </PageStack>
        );
      case 'searches':
        return (
          <PageStack>
            <PageHeader title="Búsquedas guardadas" description="Vuelve a lanzar tus criterios de búsqueda con un clic" />
            <SavedSearchesPanel />
          </PageStack>
        );
      case 'ia_history':
        return (
          <PageStack>
            <PageHeader title="Conversaciones IA" description="Retoma cualquiera de tus últimas 5 consultas con el asistente de Ubica" />
            <AIHistoryPanel />
          </PageStack>
        );
      default:
        return user?.role === 'user' ? renderUserDashboard() : renderDashboard();
    }
  };

  return renderViewContent();
}
