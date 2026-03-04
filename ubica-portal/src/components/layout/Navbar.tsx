import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  KeyIcon,
  EnvelopeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthNotifications } from '../../hooks/useAuthNotifications';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user, isAuthenticated, hasRole, logoutWithNotification } = useAuthNotifications();

  const isAmiFincasDomain = window.location.hostname === 'amifincas.es' || window.location.hostname === 'www.amifincas.es';
  const isUbicaDomain = window.location.hostname === 'ubica.amifincas.es';
  const isAmiFincasPage = location.pathname === '/ami-fincas' || isAmiFincasDomain;

  // Auto-hide navbar on scroll (only on AMI Fincas page)
  useEffect(() => {
    if (!isAmiFincasPage) {
      setNavHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling down & past threshold
        setNavHidden(true);
      } else {
        // Scrolling up
        setNavHidden(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAmiFincasPage, lastScrollY]);

  // Navegación basada en autenticación y rol
  const getNavigation = () => {
    const publicNav = [
      { name: t('nav.home'), href: isAmiFincasDomain ? 'https://ubica.amifincas.es' : '/', icon: HomeIcon, external: isAmiFincasDomain },
      { name: 'AMI Fincas', href: isUbicaDomain ? 'https://amifincas.es/ami-fincas' : '/ami-fincas', icon: BuildingOfficeIcon, external: isUbicaDomain },
    ];

    if (!isAuthenticated) {
      return publicNav;
    }

    const dashboardNav = [...publicNav];

    // Agregar navegación específica por rol
    if (hasRole('admin')) {
      dashboardNav.push({ name: t('nav.admin'), href: '/admin', icon: CogIcon, external: false });
    } else if (hasRole('realtor')) {
      dashboardNav.push({ name: t('nav.realtor'), href: '/realtor', icon: ChartBarIcon, external: false });
    } else if (hasRole('investor')) {
      dashboardNav.push({ name: t('nav.investor'), href: '/investor', icon: ChartBarIcon, external: false });
    } else if (hasRole('property_manager')) {
      dashboardNav.push({ name: t('nav.property_manager'), href: '/property-manager', icon: BuildingOfficeIcon, external: false });
    } else {
      dashboardNav.push({ name: t('nav.dashboard'), href: '/dashboard', icon: ChartBarIcon, external: false });
    }

    return dashboardNav;
  };

  const navigation = getNavigation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // Cerrar menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setIsUserMenuOpen(false);
      setIsMenuOpen(false);
    };

    if (isUserMenuOpen || isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen, isMenuOpen]);

  return (
    <nav className={`sticky top-0 z-50 border-b border-gray-200 bg-gradient-to-r from-white via-white to-emerald-50 dark:border-gray-700 dark:bg-gradient-to-r dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 shadow-sm transition-transform duration-300 ease-in-out ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-4">
              <img src="/logo_ubica.png" alt="Ubica" className="h-10 md:h-12 w-auto object-contain" />
              <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Ubica</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                item.external ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
                      text-gray-700 hover:text-[#4a9d78] dark:text-gray-300 dark:hover:text-[#4a9d78]
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
                      ${isActive(item.href)
                        ? 'bg-[#4a9d78] text-white'
                        : 'text-gray-700 hover:text-[#4a9d78] dark:text-gray-300 dark:hover:text-[#4a9d78]'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSelector />

            {isAuthenticated ? (
              <div className="relative z-50">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  className="flex items-center space-x-2 rounded-lg bg-[#4a9d78] h-10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#3a8d68] focus:outline-none focus:ring-2 focus:ring-[#4a9d78] focus:ring-offset-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  <span>{user?.full_name || user?.email}</span>
                </motion.button>

                {/* User dropdown menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 z-50"
                    >
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        {user?.role === 'admin' && t('roles.admin')}
                        {user?.role === 'realtor' && t('roles.realtor')}
                        {user?.role === 'investor' && t('roles.investor')}
                        {user?.role === 'property_manager' && t('roles.property_manager')}
                        {user?.role === 'user' && t('roles.user')}
                        {user?.company && ` - ${user.company}`}
                      </div>
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <ChartBarIcon className="h-4 w-4" />
                          <span>{t('nav.dashboard')}</span>
                        </div>
                      </Link>

                      {/* Nuevas opciones de Seguridad/Perfil */}
                      <Link
                        to="/dashboard/settings/email"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4" />
                          <span>{t('nav.change_email')}</span>
                        </div>
                      </Link>
                      <Link
                        to="/dashboard/settings/password"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <KeyIcon className="h-4 w-4" />
                          <span>{t('nav.change_password')}</span>
                        </div>
                      </Link>
                      <Link
                        to="/dashboard/settings/mfa"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <ShieldCheckIcon className="h-4 w-4" />
                          <span>{t('nav.mfa')}</span>
                        </div>
                      </Link>

                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                      <button
                        onClick={() => {
                          logoutWithNotification();
                          setIsUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          <span>{t('auth.logout')}</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => navigate('/login')}
                className="flex items-center space-x-1 rounded-lg bg-[#4a9d78] h-10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#3a8d68] focus:outline-none focus:ring-2 focus:ring-[#4a9d78] focus:ring-offset-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>{t('nav.login')}</span>
              </motion.button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4a9d78] focus:ring-offset-2 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="sr-only">{t('nav.mobile_menu')}</span>
                {isMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 md:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                className="fixed top-24 right-4 left-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-[60] md:hidden overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 space-y-4">
                  <div className="flex flex-col space-y-2">
                    {navigation.map((item) => (
                      item.external ? (
                        <a
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center space-x-4 rounded-2xl px-5 py-5 text-lg font-black transition-all duration-300
                            text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50
                          `}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <item.icon className={`h-7 w-7 text-emerald-500`} />
                          <span>{item.name}</span>
                        </a>
                      ) : (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`
                            flex items-center space-x-4 rounded-2xl px-5 py-5 text-lg font-black transition-all duration-300
                            ${isActive(item.href)
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50'
                            }
                          `}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <item.icon className={`h-7 w-7 ${isActive(item.href) ? 'text-white' : 'text-emerald-500'}`} />
                          <span>{item.name}</span>
                        </Link>
                      )
                    ))}
                  </div>

                  {/* Mobile Controls */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{t('nav.settings')}</span>
                      <LanguageSelector />
                    </div>

                    {!isAuthenticated ? (
                      <motion.button
                        onClick={() => {
                          navigate('/login');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-2 w-full rounded-xl bg-[#4a9d78] py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-[#3a8d68]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <UserCircleIcon className="h-6 w-6" />
                        <span>{t('nav.login')}</span>
                      </motion.button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 px-4 py-2 opacity-60">
                          <UserCircleIcon className="h-6 w-6 text-[#4a9d78]" />
                          <span className="text-sm font-bold truncate">{user?.full_name || user?.email}</span>
                        </div>
                        <button
                          onClick={() => {
                            logoutWithNotification();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center justify-center space-x-2 w-full rounded-xl bg-red-500/10 dark:bg-red-500/20 py-4 text-base font-bold text-red-600 dark:text-red-400 transition-all duration-200"
                        >
                          <ArrowRightOnRectangleIcon className="h-6 w-6" />
                          <span>{t('auth.logout')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav >
  );
}
