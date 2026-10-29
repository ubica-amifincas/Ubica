import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  HomeIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import PropertyFormModal from '../../components/common/PropertyFormModal';
import type { Property as ApiProperty } from '../../types';

interface Property {
  id: number;
  title: string;
  location: string;
  type: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  status: string;
  dateAdded: string;
  images: string[];
  description: string;
  features: string[];
  canEdit: boolean; // solo el propietario edita; las asignadas por el admin son de solo lectura
  raw: ApiProperty;
}

// Estados que cuentan como "a la venta o alquiler" en el portal
const AVAILABLE_STATUSES = ['for-sale', 'for-rent', 'available', 'reserved'];

interface Transaction {
  id: number;
  propertyId: number;
  propertyTitle: string;
  type: 'sale' | 'rental';
  amount: number;
  commission: number;
  date: string;
  clientName: string;
  status: 'completed' | 'pending' | 'cancelled';
}

interface RentalContract {
  id: number;
  propertyId: number;
  propertyTitle: string;
  tenantName: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'terminated';
  nextPayment: string;
}

const RealtorDashboardComplete: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'rentals' | 'sales' | 'analytics'>('overview');
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [rentals] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { t } = useLanguage();
  const { user } = useAuth();

  const loadProperties = async () => {
    try {
      // Propias (las publica la inmobiliaria) y asignadas por el admin (realtor_id)
      const [own, assigned] = await Promise.all([apiService.getUserProperties(), apiService.getRealtorProperties()]);
      const byId = new Map<number, ApiProperty>();
      [...own, ...assigned].forEach(p => byId.set(p.id, p));
      setProperties([...byId.values()].map((p: any) => ({
        id: p.id,
        title: p.title,
        location: p.location || p.city || '',
        type: p.type,
        price: p.price || 0,
        area: p.area || 0,
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        status: p.status,
        dateAdded: (p.created_at || '').split('T')[0],
        images: p.images || [],
        description: p.description || '',
        features: p.features || [],
        canEdit: p.owner_id === user?.id,
        raw: p,
      })));
    } catch (error) {
      console.error('Error loading realtor properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aún no hay modelo de transacciones ni contratos: esas secciones quedan vacías en vez de mostrar datos inventados
  useEffect(() => {
    loadProperties();
  }, []);

  // Statistics calculations
  const stats = {
    totalProperties: properties.length,
    availableProperties: properties.filter(p => AVAILABLE_STATUSES.includes(p.status)).length,
    soldProperties: properties.filter(p => p.status === 'sold').length,
    rentedProperties: properties.filter(p => p.status === 'rented').length,
    totalCommissions: transactions.reduce((sum, t) => sum + t.commission, 0),
    monthlyRentalIncome: rentals.filter(r => r.status === 'active').reduce((sum, r) => sum + r.monthlyRent, 0),
    averagePropertyPrice: properties.length > 0 ? properties.reduce((sum, p) => sum + p.price, 0) / properties.length : 0
  };

  const handleDeleteProperty = async (property: Property) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${property.title}"?`)) return;
    try {
      await apiService.deleteUserProperty(property.id);
      await loadProperties();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditProperty = (property: Property | null) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'for-sale':
      case 'for-rent': return 'bg-emerald-100 text-emerald-800';
      case 'reserved': return 'bg-orange-100 text-orange-800';
      case 'sold': return 'bg-emerald-100 text-emerald-800';
      case 'rented': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'for-sale': return 'En venta';
      case 'for-rent': return 'En alquiler';
      case 'reserved': return 'Reservada';
      case 'sold': return 'Vendida';
      case 'rented': return 'Alquilada';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-auto"> {/* Enhanced scroll */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Panel de Inmobiliaria
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido de vuelta, {user?.full_name || 'Inmobiliaria'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', icon: ChartBarIcon, label: 'Resumen' },
                { key: 'properties', icon: HomeIcon, label: 'Mis Propiedades' },
                { key: 'add-property', icon: PlusIcon, label: 'Añadir Propiedad' },
                { key: 'rentals', icon: CalendarIcon, label: 'Alquileres' },
                { key: 'sales', icon: CurrencyEuroIcon, label: 'Ventas' },
                { key: 'analytics', icon: ArrowTrendingUpIcon, label: 'Estadísticas' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => tab.key === 'add-property' ? handleEditProperty(null) : setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key
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
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <HomeIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Propiedades
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.totalProperties}
                      </dd>
                    </dl>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Disponibles
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.availableProperties}
                      </dd>
                    </dl>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyEuroIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Comisiones Totales
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                        €{stats.totalCommissions.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Ingresos Mensuales
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                        €{stats.monthlyRentalIncome.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Transactions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Transacciones Recientes
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {transactions.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay transacciones registradas.</p>
                    )}
                    {transactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.propertyTitle}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.type === 'sale' ? 'Venta' : 'Alquiler'} • {transaction.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">
                            +€{transaction.commission}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">comisión</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Property Status Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Estado de Propiedades
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Disponibles</span>
                      <span className="text-sm font-semibold text-emerald-600">{stats.availableProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Vendidas</span>
                      <span className="text-sm font-semibold text-emerald-600">{stats.soldProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Alquiladas</span>
                      <span className="text-sm font-semibold text-yellow-600">{stats.rentedProperties}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mis Propiedades ({properties.length})
              </h2>
              <button
                onClick={() => handleEditProperty(null)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Añadir Propiedad
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {properties.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <img
                    src={property.images[0] || '/images/casa-moderna.jpg'}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {property.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                        {getStatusText(property.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{property.location}</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
                      €{property.price.toLocaleString()}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div>{property.area} m²</div>
                      <div>{property.bedrooms} hab.</div>
                      <div>{property.bathrooms} baños</div>
                    </div>
                    {!property.canEdit && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Asignada por el administrador · solo lectura</p>
                    )}
                    {property.canEdit && <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditProperty(property)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors duration-200"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Eliminar
                      </button>
                    </div>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rentals' && (
          <RentalsView rentals={rentals} />
        )}

        {activeTab === 'sales' && (
          <SalesView transactions={transactions.filter(t => t.type === 'sale')} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView stats={stats} properties={properties} transactions={transactions} />
        )}

        <PropertyFormModal
          isOpen={showPropertyForm}
          onClose={() => { setShowPropertyForm(false); setEditingProperty(null); }}
          onSave={() => { setShowPropertyForm(false); setEditingProperty(null); loadProperties(); }}
          initialData={editingProperty?.raw ?? null}
        />
      </div>
    </div>
  );
};

// Rentals View Component
const RentalsView: React.FC<{ rentals: RentalContract[] }> = ({ rentals }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contratos de Alquiler ({rentals.length})
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Inquilino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Renta Mensual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {rentals.map((rental) => (
                <tr key={rental.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {rental.propertyTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{rental.tenantName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-emerald-600">
                      €{rental.monthlyRent.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{rental.nextPayment}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rental.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rental.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sales View Component
const SalesView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ventas Completadas ({transactions.length})
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Precio de Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.propertyTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{transaction.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-emerald-600">
                      €{transaction.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-emerald-600">
                      €{transaction.commission.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{transaction.date}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Analytics View Component
const AnalyticsView: React.FC<{ 
  stats: any; 
  properties: Property[]; 
  transactions: Transaction[] 
}> = ({ stats, properties, transactions }) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Estadísticas y Análisis
      </h2>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ingresos por Comisiones
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            €{stats.totalCommissions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total acumulado
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Precio Promedio
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            €{Math.round(stats.averagePropertyPrice).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Por propiedad
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tasa de Conversión
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            {properties.length > 0 ? Math.round(((stats.soldProperties + stats.rentedProperties) / properties.length) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Propiedades vendidas/alquiladas
          </p>
        </div>
      </div>

      {/* Property Status Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Distribución de Propiedades por Estado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.availableProperties}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Disponibles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.soldProperties}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Vendidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.rentedProperties}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Alquiladas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{properties.filter(p => p.status === 'pending').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtorDashboardComplete;
