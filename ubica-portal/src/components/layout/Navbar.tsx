import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  EnvelopeIcon,
  PuzzlePieceIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { panelHome } from '../../utils/panelHome';
import { isAmiSite, amiHref, ubicaHref } from '../../utils/site';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import InstallAppButton from '../common/InstallAppButton';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthNotifications } from '../../hooks/useAuthNotifications';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user, isAuthenticated, hasRole, logoutWithNotification } = useAuthNotifications();


  // Navegación basada en autenticación y rol
  const getNavigation = () => {
    // Web de AMI Fincas: sus secciones y el paso a Ubica; sin cuentas de usuario
    if (isAmiSite) {
      return [
        { name: t('ami.nav.services', 'Servicios'), href: '/#servicios', icon: WrenchScrewdriverIcon, external: true },
        { name: t('ami.nav.offices', 'Sedes'), href: '/#contacto', icon: MapPinIcon, external: true },
        { name: t('ami.nav.ubica', 'Portal inmobiliario Ubica'), href: ubicaHref('/'), icon: HomeIcon, external: true },
      ];
    }

    const publicNav = [
      { name: t('nav.home'), href: '/', icon: HomeIcon, external: false },
      { name: 'AMI Fincas', href: amiHref(), icon: BuildingOfficeIcon, external: true },
      { name: t('nav.entertainment', 'Entretenimiento'), href: '/entretenimiento', icon: PuzzlePieceIcon, external: false },
    ];

    if (!isAuthenticated) {
      return publicNav;
    }

    const dashboardNav = [...publicNav];

    // Un solo acceso al panel: cada rol entra directamente en el suyo
    dashboardNav.push({ name: t('nav.myPanel', 'Mi panel'), href: panelHome(user?.role), icon: ChartBarIcon, external: false });

    return dashboardNav;
  };

  const navigation = getNavigation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const isHomePage = location.pathname === '/';

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

  // Determinar posicionamiento del Navbar
  // Siempre visible arriba; en la portada de Ubica no, porque allí aparece la barra de búsqueda fija
  const navPosition = isHomePage && !isAmiSite ? 'relative' : 'sticky';

  return (
    <nav className={`${navPosition} top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all duration-300 ease-in-out`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            {/* Misma medida en las dos webs: logos recortados al dibujo y con la misma superficie (el de AMI es más
                cuadrado, así que va algo más alto que el apaisado de Ubica), y el nombre al mismo tamaño */}
            {isAmiSite ? (
              <Link to="/" className="flex items-center gap-2.5 sm:gap-3">
                <img src="/ami-fincas/logo-ami-mark.png" alt="" width={137} height={96} className="h-7 sm:h-[30px] lg:h-8 w-auto" />
                <span className="text-xl sm:text-[1.375rem] lg:text-2xl font-bold leading-none tracking-tight text-[#23707f] dark:text-[#8fd0c3]">AMI Fincas</span>
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2.5 sm:gap-3">
                <img src="/logo-ubica-mark.png" alt="" width={184} height={96} className="h-6 sm:h-[26px] lg:h-7 w-auto" />
                <span className="text-xl sm:text-[1.375rem] lg:text-2xl font-bold leading-none tracking-tight text-emerald-700 dark:text-emerald-400">Ubica</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <div className="ml-6 xl:ml-8 flex items-center space-x-1 xl:space-x-4">
              {navigation.map((item) => (
                item.external ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
                      text-gray-700 hover:text-[#0f6b4f] dark:text-gray-300 dark:hover:text-[#0f6b4f]
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
                        ? 'bg-[#0f6b4f] text-white'
                        : 'text-gray-700 hover:text-[#0f6b4f] dark:text-gray-300 dark:hover:text-[#0f6b4f]'
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
          <div className="hidden lg:flex items-center space-x-2">
            {/* Solo Ubica se instala como app (la web de AMI Fincas no tiene manifiesto) */}
            {!isAmiSite && <InstallAppButton />}
            <ThemeToggle />
            <LanguageSelector />

            {isAmiSite ? (
              <a
                href="/#presupuesto"
                className="flex items-center space-x-2 rounded-lg bg-[#23707f] h-10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-[#1b5a66] focus:outline-none focus:ring-2 focus:ring-[#23707f] focus:ring-offset-2"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>{t('ami.nav.contact', 'Contactar')}</span>
              </a>
            ) : isAuthenticated ? (
              <div className="relative z-50">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  title={user?.full_name || user?.email}
                  aria-label={user?.full_name || user?.email}
                  className="flex items-center space-x-2 rounded-lg bg-[#0f6b4f] h-10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#0b5440] focus:outline-none focus:ring-2 focus:ring-[#0f6b4f] focus:ring-offset-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  <span className="hidden xl:inline max-w-[12rem] truncate">{user?.full_name || user?.email}</span>
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
                        {user?.role === 'user' && t('roles.user')}
                        {user?.company && ` - ${user.company}`}
                      </div>
                      <Link
                        to={panelHome(user?.role)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <ChartBarIcon className="h-4 w-4" />
                          <span>{t('nav.myPanel')}</span>
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
                className="flex items-center space-x-1 rounded-lg bg-[#0f6b4f] h-10 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#0b5440] focus:outline-none focus:ring-2 focus:ring-[#0f6b4f] focus:ring-offset-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>{t('nav.login')}</span>
              </motion.button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0f6b4f] focus:ring-offset-2 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 lg:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                className="fixed top-24 right-4 left-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-[60] lg:hidden overflow-hidden"
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
                    {!isAmiSite && <InstallAppButton variant="menu" onDone={() => setIsMenuOpen(false)} />}

                    {isAmiSite ? (
                      <a
                        href="/#presupuesto"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center space-x-2 w-full rounded-xl bg-[#23707f] py-4 text-base font-bold text-white shadow-lg transition-colors duration-200 hover:bg-[#1b5a66]"
                      >
                        <PhoneIcon className="h-6 w-6" />
                        <span>{t('ami.nav.contact', 'Contactar')}</span>
                      </a>
                    ) : !isAuthenticated ? (
                      <motion.button
                        onClick={() => {
                          navigate('/login');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-2 w-full rounded-xl bg-[#0f6b4f] py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-[#0b5440]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <UserCircleIcon className="h-6 w-6" />
                        <span>{t('nav.login')}</span>
                      </motion.button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 px-4 py-2 opacity-60">
                          <UserCircleIcon className="h-6 w-6 text-[#0f6b4f]" />
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
