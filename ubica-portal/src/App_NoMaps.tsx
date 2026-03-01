import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './utils/i18n';
import './App.css';

// Pages
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Dashboard from './pages/Dashboard/Dashboard';
import DashboardProperties from './pages/Dashboard/DashboardProperties';
import DashboardSales from './pages/Dashboard/DashboardSales';
import DashboardRentals from './pages/Dashboard/DashboardRentals';
import DashboardInvestments from './pages/Dashboard/DashboardInvestments';

// Auth pages
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

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

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="properties" element={<Properties />} />
                  <Route path="property/:id" element={<PropertyDetail />} />
                </Route>
                
                {/* Auth Routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                
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
            </div>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;