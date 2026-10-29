import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  HomeIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  KeyIcon,
  ArrowTrendingUpIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  EnvelopeIcon,
  WalletIcon,
  HeartIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  PresentationChartLineIcon,
  BriefcaseIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import RouteFallback from '../common/RouteFallback';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';
import InstallAppButton from '../common/InstallAppButton';

type IconType = React.ComponentType<{ className?: string }>;

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  /** Solo activo con la ruta exacta (páginas índice). */
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

type TFn = (key: string, fallback?: string) => string;

/** Navegación del panel según el rol. Es el único sitio desde el que se cambia de sección. */
function buildNavigation(role: string | undefined, t: TFn): NavGroup[] {
  const mine = t('panel.group.mine', 'Mi área');
  const messages: NavItem = { label: t('panel.nav.messages', 'Mensajes'), href: '/dashboard?view=messages', icon: ChatBubbleLeftRightIcon };
  const aiHistory: NavItem = { label: t('panel.nav.aiHistory', 'Historial IA'), href: '/dashboard?view=ia_history', icon: SparklesIcon };
  const wealth: NavItem = { label: t('panel.nav.wealth', 'Patrimonio'), href: '/dashboard/wealth', icon: WalletIcon };
  const myProperties: NavItem = { label: t('panel.nav.myProperties', 'Mis propiedades'), href: '/dashboard/properties', icon: BuildingOfficeIcon };
  const quickListing: NavItem = { label: t('panel.nav.quickListing', 'Subir inmueble'), href: '/publicar', icon: CameraIcon };
  const sales: NavItem = { label: t('panel.nav.sales', 'Ventas'), href: '/dashboard/sales', icon: BanknotesIcon };
  const rentals: NavItem = { label: t('panel.nav.rentals', 'Alquileres'), href: '/dashboard/rentals', icon: KeyIcon };
  const investments: NavItem = { label: t('panel.nav.investments', 'Inversiones'), href: '/dashboard/investments', icon: ArrowTrendingUpIcon };

  switch (role) {
    case 'admin':
      return [
        {
          label: t('panel.group.admin', 'Administración'),
          items: [
            { label: t('panel.nav.overview', 'Resumen'), href: '/admin', icon: PresentationChartLineIcon, exact: true },
            { label: t('panel.nav.users', 'Usuarios'), href: '/admin/usuarios', icon: UsersIcon },
            { label: t('panel.nav.properties', 'Propiedades'), href: '/admin/propiedades', icon: BuildingOfficeIcon },
          ],
        },
        // Su resumen y la gestión de todas las propiedades ya cubren lo que había en "Mi área"
        { label: mine, items: [messages, aiHistory] },
      ];
    case 'realtor':
      return [
        {
          label: t('panel.group.realtor', 'Inmobiliaria'),
          items: [
            quickListing,
            { label: t('panel.nav.overview', 'Resumen'), href: '/realtor', icon: PresentationChartLineIcon, exact: true },
            { label: t('panel.nav.portfolioRealtor', 'Cartera de inmuebles'), href: '/realtor/propiedades', icon: HomeIcon },
            { label: t('panel.nav.rentals', 'Alquileres'), href: '/realtor/alquileres', icon: KeyIcon },
            { label: t('panel.nav.sales', 'Ventas'), href: '/realtor/ventas', icon: BanknotesIcon },
            { label: t('panel.nav.analytics', 'Estadísticas'), href: '/realtor/estadisticas', icon: ArrowTrendingUpIcon },
          ],
        },
        // Cartera, alquileres y ventas ya incluyen sus propios inmuebles: aquí solo lo que no se repite
        { label: mine, items: [investments, wealth, messages, aiHistory] },
      ];
    case 'investor':
      return [
        {
          label: t('panel.group.investor', 'Inversor'),
          items: [
            { label: t('panel.nav.overview', 'Resumen'), href: '/investor', icon: PresentationChartLineIcon, exact: true },
            { label: t('panel.nav.opportunities', 'Oportunidades'), href: '/investor/oportunidades', icon: LightBulbIcon },
            { label: t('panel.nav.wealth', 'Patrimonio'), href: '/investor/patrimonio', icon: WalletIcon },
          ],
        },
        { label: mine, items: [quickListing, myProperties, sales, rentals, messages, aiHistory] },
      ];
    default:
      return [
        {
          label: mine,
          items: [
            { label: t('panel.nav.overview', 'Resumen'), href: '/dashboard', icon: ChartBarIcon, exact: true },
            quickListing,
            myProperties,
            wealth,
            messages,
            aiHistory,
            { label: t('panel.nav.favorites', 'Favoritos'), href: '/dashboard?view=favorites', icon: HeartIcon },
            { label: t('panel.nav.searches', 'Búsquedas'), href: '/dashboard?view=searches', icon: MagnifyingGlassIcon },
          ],
        },
      ];
  }
}

function useIsActive() {
  const location = useLocation();
  return (item: NavItem) => {
    const [path, query] = item.href.split('?');
    const view = new URLSearchParams(location.search).get('view');
    if (query) {
      return location.pathname === path && view === new URLSearchParams(query).get('view');
    }
    if (item.exact) {
      const samePath = location.pathname.replace(/\/+$/, '') === path;
      // /dashboard con ?view=... es otra sección (Mensajes, Favoritos...)
      return samePath && (path !== '/dashboard' || !view || view === 'dashboard');
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
}

function Avatar({ name, src, size = 'md' }: { name?: string; src?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';
  if (src) return <img src={src} alt="" className={`${dim} flex-shrink-0 rounded-full object-cover`} />;
  return (
    <span className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300`}>
      {name?.trim().charAt(0).toUpperCase() || 'U'}
    </span>
  );
}

function SidebarContent({
  groups,
  settings,
  onNavigate,
  onLogout,
}: {
  groups: NavGroup[];
  settings: NavGroup;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const isActive = useIsActive();
  const { user } = useAuth();
  const { t } = useLanguage();

  const renderItem = (item: NavItem) => {
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-white'
        }`}
      >
        <item.icon
          className={`h-5 w-5 flex-shrink-0 ${
            active ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
          }`}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const renderGroup = (group: NavGroup) => (
    <div key={group.label}>
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group.label}</p>
      <div className="space-y-0.5">{group.items.map(renderItem)}</div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label={t('panel.navLabel', 'Secciones del panel')}>
        {groups.map(renderGroup)}
        {renderGroup(settings)}
      </nav>

      <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-700">
        <Link to="/dashboard/settings/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
          <Avatar name={user?.full_name} src={user?.avatar} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || user?.email || t('roles.user')}</span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{t(`roles.${user?.role || 'user'}`)}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title={t('dashboard.logout')}
          aria-label={t('dashboard.logout')}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('panel.userMenu', 'Menú de usuario')}
        className="flex h-10 items-center gap-1 rounded-lg pl-1 pr-1.5 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-gray-700"
      >
        <Avatar name={user?.full_name} src={user?.avatar} size="sm" />
        <ChevronDownIcon className="hidden h-4 w-4 text-gray-500 sm:block dark:text-gray-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || t('roles.user')}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <Link role="menuitem" to="/dashboard/settings/profile" className={itemClass}>
            <UserCircleIcon className="h-4 w-4 text-gray-400" /> {t('panel.nav.profile', 'Mi perfil')}
          </Link>
          <Link role="menuitem" to="/" className={itemClass}>
            <HomeIcon className="h-4 w-4 text-gray-400" /> {t('panel.goToPortal', 'Ir al portal')}
          </Link>
          <InstallAppButton variant="item" />
          <button role="menuitem" type="button" onClick={onLogout} className={`${itemClass} border-t border-gray-200 dark:border-gray-700`}>
            <ArrowLeftOnRectangleIcon className="h-4 w-4 text-gray-400" /> {t('dashboard.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const isActive = useIsActive();

  const groups = useMemo(() => buildNavigation(user?.role, t as TFn), [user?.role, t]);
  const settings: NavGroup = useMemo(
    () => ({
      label: t('panel.group.settings', 'Configuración'),
      items: [
        { label: t('panel.nav.profile', 'Mi perfil'), href: '/dashboard/settings/profile', icon: UserCircleIcon },
        { label: t('panel.nav.changeEmail', 'Cambiar email'), href: '/dashboard/settings/email', icon: EnvelopeIcon },
        { label: t('panel.nav.changePassword', 'Cambiar contraseña'), href: '/dashboard/settings/password', icon: KeyIcon },
      ],
    }),
    [t],
  );

  // Título de la barra superior: grupo + sección activa
  const current = [...groups, settings]
    .flatMap(g => g.items.map(item => ({ group: g.label, item })))
    .find(({ item }) => isActive(item));

  // El cajón se cierra al navegar y con Escape; mientras está abierto, la página no hace scroll
  useEffect(() => setIsDrawerOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsDrawerOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isDrawerOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const logo = (
    <Link to="/" className="flex items-center gap-3" aria-label="Ubica, ir al portal">
      <img src="/logo_ubica.png" alt="" className="h-9 w-auto object-contain" />
      <span className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">Ubica</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Barra lateral fija (lg+) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-16 flex-shrink-0 items-center border-b border-gray-200 px-5 dark:border-gray-700">{logo}</div>
        <div className="min-h-0 flex-1">
          <SidebarContent groups={groups} settings={settings} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Cajón lateral (< lg) */}
      <div className="lg:hidden">
        {isDrawerOpen && (
          <div className="fixed inset-0 z-40 bg-gray-900/50" aria-hidden="true" onClick={() => setIsDrawerOpen(false)} />
        )}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('panel.navLabel', 'Secciones del panel')}
          aria-hidden={!isDrawerOpen}
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-gray-800 ${
            isDrawerOpen ? 'translate-x-0' : 'invisible -translate-x-full'
          }`}
        >
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
            {logo}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label={t('panel.closeMenu', 'Cerrar menú')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarContent groups={groups} settings={settings} onNavigate={() => setIsDrawerOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={t('panel.openMenu', 'Abrir menú')}
            aria-expanded={isDrawerOpen}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              <span className="hidden sm:inline">{current ? current.group : t('panel.group.mine', 'Mi área')}</span>
              {current && <span className="hidden sm:inline" aria-hidden="true"> / </span>}
              {current && <span className="font-semibold text-gray-900 dark:text-white">{current.item.label}</span>}
              {!current && <span className="font-semibold text-gray-900 dark:text-white sm:hidden">{t('panel.group.mine', 'Mi área')}</span>}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <UserMenu onLogout={handleLogout} />
          </div>
        </header>

        {/* Contenido: mismo ancho y relleno en todos los paneles */}
        <main className="flex-1 focus:outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {user?.role === 'realtor' && user.is_approved === false && (
              <p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                Tu cuenta de inmobiliaria está pendiente de aprobación. Mientras tanto, revisaremos tus anuncios antes de publicarlos.
              </p>
            )}
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
