import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

import './utils/i18n';
import './App.css';

// Pages
import Home from './pages/Home';
import AmiFincas from './pages/AmiFincas';
import PropertyDetail from './pages/PropertyDetail';
import Dashboard from './pages/Dashboard/Dashboard';
import DashboardProperties from './pages/Dashboard/DashboardProperties';
import DashboardSales from './pages/Dashboard/DashboardSales';
import DashboardRentals from './pages/Dashboard/DashboardRentals';
import DashboardInvestments from './pages/Dashboard/DashboardInvestments';
import SettingsEmail from './pages/Dashboard/SettingsEmail';
import SettingsPassword from './pages/Dashboard/SettingsPassword';
import SettingsMFA from './pages/Dashboard/SettingsMFA';
import ProfileSettings from './pages/Dashboard/ProfileSettings';
import WealthManagement from './pages/Dashboard/WealthManagement';

// Auth pages
import AuthPage from './pages/AuthPage';
import VerifyEmail from './pages/VerifyEmail';

// Layout components
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard';

// Realtor pages
import RealtorDashboard from './pages/Realtor/RealtorDashboard';
import RealtorProperties from './pages/Realtor/RealtorProperties';
import RealtorTransactions from './pages/Realtor/RealtorTransactions';

// Investor pages
import InvestorDashboard from './pages/Investor/InvestorDashboard';
import InvestorPortfolio from './pages/Investor/InvestorPortfolio';
import InvestorOpportunities from './pages/Investor/InvestorOpportunities';

// Property Manager pages
import PropertyManagerDashboard from './pages/PropertyManager/PropertyManagerDashboard';

// Legal & Info pages
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Cookies
import { CookieConsentBanner } from './components/cookies/CookieConsentBanner';
import { useCookieConsent } from './hooks/useCookieConsent';
import PoliticaCookies from './pages/PoliticaCookies';

// Entertainment
import EntertainmentHub from './pages/Entertainment/EntertainmentHub';
import TasadorExpress from './pages/Entertainment/TasadorExpress';
import UbicaPuzzle from './pages/Entertainment/UbicaPuzzle';

// Lazy load heavy 3D components to avoid crashing the main bundle
const UbicaBalance = lazy(() => import('./pages/Entertainment/UbicaBalance'));

// Quick wins
import ScrollToTop from './components/common/ScrollToTop';
import useDocumentTitle from './hooks/useDocumentTitle';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { AIChatProvider } from './contexts/AIChatContext';
import AIChatModal from './components/ai/AIChatModal';

function AppRoutes() {
  useDocumentTitle();
  const { showBanner, acceptAll, rejectAll, updatePreferences } = useCookieConsent();
  const location = useLocation();
  const isAmiFincasDomain = window.location.hostname === 'amifincas.es' || window.location.hostname === 'www.amifincas.es';

  // Redirigir todo excepto /ami-fincas a ubica.amifincas.es
  useEffect(() => {
    if (isAmiFincasDomain && !location.pathname.startsWith('/ami-fincas')) {
      window.location.replace(`https://ubica.amifincas.es${location.pathname}${window.location.search}`);
    }
  }, [isAmiFincasDomain, location.pathname]);

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="ami-fincas" element={<AmiFincas />} />
            <Route path="property/:id" element={<PropertyDetail />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="politica-cookies" element={<PoliticaCookies />} />

            {/* Entertainment Routes */}
            <Route path="entretenimiento" element={<EntertainmentHub />} />
            <Route path="entretenimiento/tasador" element={<TasadorExpress />} />
            <Route path="entretenimiento/puzzle" element={<UbicaPuzzle />} />
            <Route path="entretenimiento/balance" element={
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
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/verify" element={<VerifyEmail />} />

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
              <Route path="email" element={<SettingsEmail />} />
              <Route path="password" element={<SettingsPassword />} />
              <Route path="mfa" element={<SettingsMFA />} />
              <Route path="profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles="admin">
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* Realtor Routes */}
          <Route path="/realtor" element={
            <ProtectedRoute requiredRoles="realtor">
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RealtorDashboard />} />
            <Route path="properties" element={<RealtorProperties />} />
            <Route path="transactions" element={<RealtorTransactions />} />
          </Route>

          {/* Investor Routes */}
          <Route path="/investor" element={
            <ProtectedRoute requiredRoles="investor">
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<InvestorDashboard />} />
            <Route path="portfolio" element={<InvestorPortfolio />} />
            <Route path="opportunities" element={<InvestorOpportunities />} />
          </Route>

          {/* Property Manager Routes */}
          <Route path="/property-manager" element={
            <ProtectedRoute requiredRoles="property_manager">
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PropertyManagerDashboard />} />
          </Route>
        </Routes>

        {/* Cookie Consent Banner */}
        {showBanner && (
          <CookieConsentBanner
            onAcceptAll={acceptAll}
            onRejectAll={rejectAll}
            onCustomize={updatePreferences}
          />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Global AI Chat */}
        <AIChatModal />
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
            <Router>
              <AppRoutes />
            </Router>
          </AIChatProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;

