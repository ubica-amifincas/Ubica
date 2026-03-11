import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldCheckIcon,
  WalletIcon,
  HeartIcon,
  SparklesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  const isInvestor = user?.role === 'investor';
  const isStandardUser = user?.role === 'user';

  const navigation = [
    ...(isInvestor
      ? [{ name: 'Panel de Inversionista', href: '/investor', icon: ArrowTrendingUpIcon }]
      : [{ name: t('dashboard.overview'), href: '/dashboard', icon: ChartBarIcon }]
    ),
    ...(!isStandardUser ? [
      { name: t('dashboard.properties'), href: '/dashboard/properties', icon: BuildingOfficeIcon },
      { name: t('dashboard.sales'), href: '/dashboard/sales', icon: BanknotesIcon },
      { name: t('dashboard.rentals'), href: '/dashboard/rentals', icon: KeyIcon },
    ] : []),
    ...(!isInvestor && !isStandardUser ? [{ name: t('dashboard.investments'), href: '/dashboard/investments', icon: ArrowTrendingUpIcon }] : []),
    { name: 'Patrimonio', href: '/dashboard/wealth', icon: WalletIcon },
    { name: 'Mensajes', href: '/dashboard?view=messages', icon: EnvelopeIcon },
    { name: 'Historial IA', href: '/dashboard?view=ia_history', icon: SparklesIcon },
    ...(isStandardUser ? [
      { name: 'Favoritos', href: '/dashboard?view=favorites', icon: HeartIcon },
      { name: 'Búsquedas', href: '/dashboard?view=searches', icon: MagnifyingGlassIcon },
    ] : []),
  ];

  const settingsNavigation = [
    { name: 'Mi Perfil', href: '/dashboard/settings/profile', icon: UserCircleIcon },
    { name: 'Cambiar Email', href: '/dashboard/settings/email', icon: EnvelopeIcon },
    { name: 'Cambiar Contraseña', href: '/dashboard/settings/password', icon: KeyIcon },
    { name: 'Configurar MFA', href: '/dashboard/settings/mfa', icon: ShieldCheckIcon },
  ];

  const isActive = (href: string) => {
    const currentPath = location.pathname + location.search;
    
    // Explicit match including query parameters (like ?view=ia_history)
    if (currentPath === href) {
        return true;
    }

    // Exact paths without query string
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' && (!location.search || location.search === '?view=dashboard');
    }
    
    // For other paths that are pure paths (like '/dashboard/investments' or '/investor')
    if (!href.includes('?')) {
        if (href === '/investor') return location.pathname === href;
        return location.pathname.startsWith(href);
    }

    return false;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <Link to="/" className="flex items-center justify-center w-full">
              <img
                src="/logo_ubica.png"
                alt="Ubica"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${isActive(item.href)
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}

              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Configuración
                </p>
                {settingsNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${isActive(item.href)
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>

            {/* User Section */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <Link to="/dashboard/settings/profile" className="flex items-center space-x-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {user?.full_name || 'Admin Ubica'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || 'admin@ubica.com'}
                  </p>
                </div>
              </Link>

              <motion.button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                {t('dashboard.logout')}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-gray-600 opacity-75"
                onClick={() => setIsSidebarOpen(false)}
              />
            </motion.div>

            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 md:hidden flex flex-col"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between flex-shrink-0 px-4 pt-5">
                <Link to="/" className="flex items-center">
                  <img
                    src="/logo_ubica.png"
                    alt="Ubica"
                    className="h-10 w-auto object-contain"
                  />
                </Link>
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                <nav className="px-4 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-base font-medium rounded-md transition-all duration-200
                        ${isActive(item.href)
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                        }
                      `}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  ))}

                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Configuración
                    </p>
                    {settingsNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`
                          group flex items-center px-2 py-2 text-base font-medium rounded-md transition-all duration-200
                          ${isActive(item.href)
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                          }
                        `}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-700"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="ml-2 text-2xl font-semibold text-gray-900 dark:text-white md:ml-0">
                {t('dashboard.title')}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/"
                className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <HomeIcon className="h-4 w-4" />
                <span className="hidden sm:block">{t('nav.home')}</span>
              </Link>
              <ThemeToggle />
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div >
  );
}
