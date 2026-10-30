import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

import './utils/i18n';
import './App.css';

// Página de inicio y layouts: se cargan con el bundle principal
import Home from './pages/Home';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RouteFallback from './components/common/RouteFallback';

// Consentimiento de cookies (banner y panel de configuración de AgenciaDatos)
import CookieConsent from './components/cookies/CookieConsentBanner';
import { CookieConsentProvider } from './contexts/CookieConsentContext';

// Quick wins
import ScrollToTop from './components/common/ScrollToTop';
import useDocumentTitle from './hooks/useDocumentTitle';
import { AMI_PATH, AMI_SITE_PATHS, isAmiSite, amiHref, ubicaHref } from './utils/site';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { AIChatProvider } from './contexts/AIChatContext';
import AIChatModal from './components/ai/AIChatModal';

// Páginas públicas (carga diferida)
const AmiFincas = lazy(() => import('./pages/AmiFincas'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const PoliticaCookies = lazy(() => import('./pages/PoliticaCookies'));
const AvisoLegal = lazy(() => import('./pages/AvisoLegal'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Entretenimiento
const EntertainmentHub = lazy(() => import('./pages/Entertainment/EntertainmentHub'));
const TasadorExpress = lazy(() => import('./pages/Entertainment/TasadorExpress'));
const UbicaBalance = lazy(() => import('./pages/Entertainment/UbicaBalance')); // three.js
// Escaparate digital: la pantalla del cristal de la oficina
const Escaparate = lazy(() => import('./pages/Escaparate'));

// Autenticación
const AuthPage = lazy(() => import('./pages/AuthPage'));
const QuickListing = lazy(() => import('./pages/QuickListing'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConfirmEmailChange = lazy(() => import('./pages/ConfirmEmailChange'));

// Área privada
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const DashboardProperties = lazy(() => import('./pages/Dashboard/DashboardProperties'));
const DashboardSales = lazy(() => import('./pages/Dashboard/DashboardSales'));
const DashboardRentals = lazy(() => import('./pages/Dashboard/DashboardRentals'));
const DashboardInvestments = lazy(() => import('./pages/Dashboard/DashboardInvestments'));
const SettingsEmail = lazy(() => import('./pages/Dashboard/SettingsEmail'));
const SettingsPassword = lazy(() => import('./pages/Dashboard/SettingsPassword'));
const ProfileSettings = lazy(() => import('./pages/Dashboard/ProfileSettings'));
const WealthManagement = lazy(() => import('./pages/Dashboard/WealthManagement'));

// Paneles por rol
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const RealtorDashboard = lazy(() => import('./pages/Realtor/RealtorDashboard'));
const InvestorDashboard = lazy(() => import('./pages/Investor/InvestorDashboard'));

function AppRoutes() {
  useDocumentTitle();
  const location = useLocation();

  // Cada página se sirve en la web de su producto. En la de AMI Fincas (amifincas.es) solo están su
  // portada, en la raíz, y los textos legales; lo demás es Ubica. /ami-fincas es la dirección antigua.
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(location.search);
  params.delete('site');
  const query = params.toString() ? `?${params}` : '';
  let externalTarget: string | null = null;
  let internalTarget: string | null = null;
  if (isAmiSite) {
    if (path === AMI_PATH) internalTarget = `/${location.hash}`;
    else if (!AMI_SITE_PATHS.includes(path)) externalTarget = ubicaHref(`${path}${query}`);
  } else if (path === AMI_PATH) {
    externalTarget = amiHref(`/${location.hash}`);
  }

  useEffect(() => {
    if (externalTarget) window.location.replace(externalTarget);
  }, [externalTarget]);

  if (externalTarget) return <RouteFallback fullScreen />;
  if (internalTarget) return <Navigate to={internalTarget} replace />;

  // En el escaparate no hay nadie delante con quien hablar: sin banner de cookies, asistente ni aviso de instalar
  const isShowcase = path === '/escaparate';

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Suspense fallback={<RouteFallback fullScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={isAmiSite ? <AmiFincas /> : <Home />} />
              <Route path="ami-fincas" element={<AmiFincas />} />
              {/* Dirección pública de la ficha; /property/:id es la antigua y se corrige al cargar */}
              <Route path="inmueble/:slug" element={<PropertyDetail />} />
              <Route path="property/:id" element={<PropertyDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="politica-cookies" element={<PoliticaCookies />} />
              <Route path="aviso-legal" element={<AvisoLegal />} />

              {/* Entertainment Routes */}
              <Route path="entretenimiento" element={<EntertainmentHub />} />
              <Route path="entretenimiento/tasador" element={<TasadorExpress />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Fullscreen Games (Outside MainLayout) */}
            <Route path="/entretenimiento/balance" element={
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p className="text-emerald-400 font-bold">Cargando motor 3D...</p>
                  </div>
                </div>
              }>
                <UbicaBalance />
              </Suspense>
            } />

            {/* Escaparate de la oficina: pantalla completa, sin barra ni pie */}
            <Route path="/escaparate" element={<Escaparate />} />

            {/* Auth Routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

            {/* Subir un inmueble desde el móvil: pantalla completa, sin el menú del panel */}
            <Route path="/publicar" element={
              <ProtectedRoute>
                <QuickListing />
              </ProtectedRoute>
            } />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="properties" element={<DashboardProperties />} />
              <Route path="sales" element={<DashboardSales />} />
              <Route path="rentals" element={<DashboardRentals />} />
              <Route path="investments" element={<DashboardInvestments />} />
              <Route path="wealth" element={<WealthManagement />} />
              <Route path="settings">
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="email" element={<SettingsEmail />} />
                <Route path="password" element={<SettingsPassword />} />
                <Route path="profile" element={<ProfileSettings />} />
              </Route>
            </Route>

            {/* Admin Routes: mismo armazón que el resto de paneles; cada sección tiene su URL */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard section="overview" />} />
              <Route path="usuarios" element={<AdminDashboard section="users" />} />
              <Route path="propiedades" element={<AdminDashboard section="properties" />} />
              <Route path="users" element={<Navigate to="/admin/usuarios" replace />} />
              <Route path="properties" element={<Navigate to="/admin/propiedades" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            {/* Realtor Routes */}
            <Route path="/realtor" element={
              <ProtectedRoute requiredRoles="realtor">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<RealtorDashboard section="overview" />} />
              <Route path="propiedades" element={<RealtorDashboard section="properties" />} />
              <Route path="alquileres" element={<DashboardRentals />} />
              <Route path="ventas" element={<DashboardSales />} />
              <Route path="estadisticas" element={<RealtorDashboard section="analytics" />} />
              <Route path="properties" element={<Navigate to="/realtor/propiedades" replace />} />
              <Route path="rentals" element={<Navigate to="/realtor/alquileres" replace />} />
              <Route path="sales" element={<Navigate to="/realtor/ventas" replace />} />
              <Route path="analytics" element={<Navigate to="/realtor/estadisticas" replace />} />
              <Route path="*" element={<Navigate to="/realtor" replace />} />
            </Route>

            {/* Investor Routes */}
            <Route path="/investor" element={
              <ProtectedRoute requiredRoles="investor">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<InvestorDashboard section="overview" />} />
              <Route path="portfolio" element={<Navigate to="/investor" replace />} />
              <Route path="oportunidades" element={<InvestorDashboard section="opportunities" />} />
              <Route path="patrimonio" element={<InvestorDashboard section="wealth" />} />
              <Route path="opportunities" element={<Navigate to="/investor/oportunidades" replace />} />
              <Route path="wealth" element={<Navigate to="/investor/patrimonio" replace />} />
              <Route path="*" element={<Navigate to="/investor" replace />} />
            </Route>
          </Routes>
        </Suspense>

        {/* Banner y panel de cookies */}
        {!isShowcase && <CookieConsent />}

        {/* La app instalable y el asistente IA son de Ubica: no aparecen en la web de AMI Fincas */}
        {!isAmiSite && !isShowcase && <PWAInstallPrompt />}
        {!isAmiSite && !isShowcase && <AIChatModal />}
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AIChatProvider>
            <CookieConsentProvider>
              <Router>
                <AppRoutes />
              </Router>
            </CookieConsentProvider>
          </AIChatProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
