// Property Types
export interface Property {
  id: number;
  title: string;
  price: number;
  type: 'villa' | 'apartment' | 'house' | 'penthouse' | 'townhouse' | 'studio' | 'duplex' | 'piso' | 'terreno';
  status: 'for-sale' | 'for-rent' | 'sold' | 'rented' | 'under-renovation' | 'in-use' | 'reserved';
  bedrooms: number;
  bathrooms: number;
  area: number;
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  images: string[];
  features: string[];
  description: string;
  yearBuilt: number;
  orientation: string;
  energyRating: string;
  investmentData: InvestmentData;
  // Campos financieros de inversión
  purchasePrice?: number;
  totalCost?: number;
  monthlyCost?: number;
  monthlyIncome?: number;
  created_at?: string;
  updated_at?: string;
  owner_id?: number;
  realtor_id?: number;
}

export interface InvestmentData {
  roi: number;
  rentalYield: number;
  monthsOnMarket: number;
  priceHistory: number[];
}

// Dashboard Types
export interface DashboardData {
  overview: DashboardOverview;
  salesData: SalesData;
  rentalData: RentalData;
  investmentAnalysis: InvestmentAnalysis;
  properties: DashboardProperty[];
}

export interface DashboardOverview {
  totalProperties: number;
  totalSales: number;
  totalRentals: number;
  activeInvestments: number;
  monthlyRevenue: number;
  averageROI: number;
  occupancyRate: number;
}

export interface SalesData {
  monthlyData: MonthlyData[];
  topProperties: TopProperty[];
  totalCommissions: number;
}

export interface MonthlyData {
  month: string;
  sales: number;
  revenue: number;
}

export interface TopProperty {
  id: number;
  title: string;
  price: number;
  commission: number;
}

export interface RentalData {
  monthlyIncome: MonthlyIncome[];
  topRentals: TopRental[];
  averageOccupancy: number;
}

export interface MonthlyIncome {
  month: string;
  income: number;
  properties: number;
}

export interface TopRental {
  id: number;
  title: string;
  monthlyRent: number;
  occupancy: number;
}

export interface InvestmentAnalysis {
  roiData: ROIData[];
  marketTrends: MarketTrend[];
  timeOnMarket: TimeOnMarket;
}

export interface ROIData {
  propertyType: string;
  averageROI: number;
  count: number;
}

export interface MarketTrend {
  quarter: string;
  averagePrice: number;
  growth: number;
}

export interface TimeOnMarket {
  average: number;
  byType: Record<string, number>;
}

export interface DashboardProperty {
  id: number;
  title: string;
  status: 'vendida' | 'alquilada' | 'disponible';
  price: number;
  monthlyRent?: number;
  type: string;
  location: string;
  dateListed: string;
  dateSold?: string;
  dateRented?: string;
  commission?: number;
}

// Map Types
export interface MapConfig {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  maxZoom: number;
  minZoom: number;
  restriction?: {
    latLngBounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    strictBounds: boolean;
  };
}

export interface CityCoordinate {
  name: string;
  lat: number;
  lng: number;
}

export interface MarkerConfig {
  fillColor: string;
  strokeColor: string;
  scale: number;
  fillOpacity: number;
}

// Filter Types
export interface PropertyFilters {
  type: string;
  location: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  status: string;
  searchTerm: string;
}

// User Types
export interface User {
  id: number;
  email: string;
  full_name: string;
  name: string;
  role: 'admin' | 'realtor' | 'investor' | 'property_manager' | 'user';
  avatar?: string;
  company?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Theme and Language Types
export type Theme = 'light' | 'dark';
export type Language = 'es' | 'en';

// Component Props Types
export interface PropertyCardProps {
  property: Property;
  onViewDetails: (id: number) => void;
}

export interface MapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect: (property: Property) => void;
  theme: Theme;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form Types
export interface PropertyFormData {
  title: string;
  price: number;
  type: Property['type'];
  status: Property['status'];
  bedrooms: number;
  bathrooms: number;
  area: number;
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  features: string[];
  description: string;
  yearBuilt: number;
  orientation: string;
  energyRating: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

// Route Types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  title: string;
  requiresAuth?: boolean;
  layout?: 'default' | 'dashboard';
}
