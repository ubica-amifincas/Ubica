import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuthenticatedFetch, useAuth } from '../../contexts/AuthContext';
import type { Property } from '../../types';
import PropertyFormModal from '../../components/common/PropertyFormModal';

export default function DashboardProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { t } = useLanguage();
  const apiService = useAuthenticatedFetch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllPropertiesDashboard();
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowModal(true);
  };

  const handleCreateProperty = () => {
    setEditingProperty(null);
    setShowModal(true);
  };

  const handleDeleteProperty = async (property: Property) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la propiedad "${property.title}"?`)) {
      try {
        await apiService.deleteUserProperty(property.id);
        await loadProperties();
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const filteredProperties = properties.filter(property => {
    if (filter === 'all') return true;
    return property.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'rented':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'for-sale':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'for-rent':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'under-renovation':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'in-use':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'reserved':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'sold': return 'Vendida';
      case 'rented': return 'Alquilada';
      case 'for-sale': return 'En Venta';
      case 'for-rent': return 'En Alquiler';
      case 'under-renovation': return 'En Reforma';
      case 'in-use': return 'En Uso';
      case 'reserved': return 'Reservado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.properties')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestiona tu portafolio de propiedades
          </p>
        </div>

        <motion.button
          onClick={handleCreateProperty}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Agregar Propiedad
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtrar por estado:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'for-sale', label: 'En Venta' },
              { key: 'for-rent', label: 'En Alquiler' },
              { key: 'sold', label: 'Vendidas' },
              { key: 'rented', label: 'Alquiladas' },
              { key: 'in-use', label: 'En Uso' },
              { key: 'reserved', label: 'Reservado' }
            ].map((item) => (
              <motion.button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${filter === item.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Properties Table */}
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Propiedad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProperties.map((property, index) => (
                <motion.tr
                  key={property.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {property.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {property.type}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {property.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0
                      }).format(property.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property.status)}`}>
                      {translateStatus(property.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {property.created_at ? new Date(property.created_at).toLocaleDateString('es-ES') : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <motion.button
                        onClick={() => navigate(`/property/${property.id}`)}
                        title="Ver en web"
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </motion.button>
                      {(user?.role === 'admin' || user?.id === property.owner_id || user?.id === property.realtor_id) && (
                        <>
                          <motion.button
                            onClick={() => handleEditProperty(property)}
                            title="Editar"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteProperty(property)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
            Propiedades Vendidas
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {properties.filter(p => p.status === 'sold').length}
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            Total de ventas realizadas
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Propiedades Alquiladas
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {properties.filter(p => p.status === 'rented').length}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Generando ingresos mensuales
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
            Propiedades En Venta
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {properties.filter(p => p.status === 'for-sale' || p.status === 'for-rent').length}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Listas para venta o alquiler
          </p>
        </div>
      </motion.div>

      {/* Property Modal */}
      <PropertyFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={loadProperties}
        initialData={editingProperty}
      />
    </div>
  );
}
