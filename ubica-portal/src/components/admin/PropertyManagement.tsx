import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';
import PropertyFormModal from '../common/PropertyFormModal';
import { ImportPropertiesModal } from './ImportPropertiesModal';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PropertyFormData {
  title: string;
  price: number;
  type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  location: string;
  address: string;
  description: string;
  features: string[];
  images: string[];
  yearBuilt: number;
  orientation: string;
  energyRating: string;
  coordinates: { lat: number; lng: number };
  investmentData: { roi: number; rentalYield: number; monthsOnMarket: number };
}

const PROPERTY_TYPES = [
  { value: 'villa', label: 'Villa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'atico', label: 'Ático' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'estudio', label: 'Estudio' },
];

const PROPERTY_STATUS = [
  { value: 'available', label: 'Disponible', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Vendido', color: 'bg-red-100 text-red-800' },
  { value: 'rented', label: 'Alquilado', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'reserved', label: 'Reservado', color: 'bg-yellow-100 text-yellow-800' },
];

const MURCIA_LOCATIONS = [
  'Cartagena', 'Murcia', 'Lorca', 'Águilas', 'San Pedro del Pinatar',
  'Torre Pacheco', 'Molina de Segura', 'Totana', 'Alcantarilla', 'Cieza'
];

const COMMON_FEATURES = [
  'Piscina privada', 'Jardín', 'Garaje', 'Aire acondicionado', 'Terraza',
  'Balcón', 'Ascensor', 'Trastero', 'Calefacción', 'Parking',
  'Vistas al mar', 'Cerca de la playa', 'Amueblado', 'Cocina equipada'
];

const PropertyManagement: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    price: 0,
    type: 'apartamento',
    status: 'available',
    bedrooms: 1,
    bathrooms: 1,
    area: 50,
    location: 'Cartagena',
    address: '',
    description: '',
    features: [],
    images: [],
    yearBuilt: new Date().getFullYear(),
    orientation: 'Sur',
    energyRating: 'A',
    coordinates: { lat: 37.9922, lng: -1.1307 },
    investmentData: { roi: 5, rentalYield: 4, monthsOnMarket: 0 }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [featuresInput, setFeaturesInput] = useState('');
  const [imagesInput, setImagesInput] = useState('');
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const propertiesData = await apiService.getAllPropertiesAdmin();
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = () => {
    setEditingProperty(null);
    setFormData({
      title: '',
      price: 0,
      type: 'apartamento',
      status: 'available',
      bedrooms: 1,
      bathrooms: 1,
      area: 50,
      location: 'Cartagena',
      address: '',
      description: '',
      features: [],
      images: [],
      yearBuilt: new Date().getFullYear(),
      orientation: 'Sur',
      energyRating: 'A',
      coordinates: { lat: 37.9922, lng: -1.1307 },
      investmentData: { roi: 5, rentalYield: 4, monthsOnMarket: 0 }
    });
    setFeaturesInput('');
    setImagesInput('');
    setErrors({});
    setShowModal(true);
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      price: property.price,
      type: property.type,
      status: property.status,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      location: property.location,
      address: property.address,
      description: property.description,
      features: property.features || [],
      images: property.images || [],
      yearBuilt: property.yearBuilt || new Date().getFullYear(),
      orientation: property.orientation || 'Sur',
      energyRating: property.energyRating || 'A',
      coordinates: property.coordinates || { lat: 37.9922, lng: -1.1307 },
      investmentData: property.investmentData || { roi: 5, rentalYield: 4, monthsOnMarket: 0 }
    });
    setFeaturesInput((property.features || []).join(', '));
    setImagesInput((property.images || []).join('\n'));
    setErrors({});
    setShowModal(true);
  };

  const handleDeleteProperty = async (property: Property) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la propiedad "${property.title}"?`)) {
      try {
        await apiService.deleteProperty(property.id);
        await fetchProperties();
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }

    if (formData.price <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }

    if (formData.bedrooms < 0) {
      newErrors.bedrooms = 'Las habitaciones no pueden ser negativas';
    }

    if (formData.bathrooms < 0) {
      newErrors.bathrooms = 'Los baños no pueden ser negativos';
    }

    if (formData.area <= 0) {
      newErrors.area = 'El área debe ser mayor a 0';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es requerida';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Procesar features e images
    const features = featuresInput
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const images = imagesInput
      .split('\n')
      .map(img => img.trim())
      .filter(img => img.length > 0);

    try {
      const propertyData = {
        ...formData,
        features,
        images: images.length > 0 ? images : ['/images/casa-moderna.jpg'], // Imagen por defecto
      };

      if (editingProperty) {
        // Actualizar propiedad
        await apiService.updateProperty(editingProperty.id, propertyData);
      } else {
        // Crear propiedad
        await apiService.createProperty(propertyData);
      }

      setShowModal(false);
      await fetchProperties();
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  };

  const getStatusInfo = (status: string) => {
    return PROPERTY_STATUS.find(s => s.value === status) || PROPERTY_STATUS[0];
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Propiedades
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra el catálogo de propiedades del sistema
          </p>
        </div>
        <div className="flex gap-3 mt-3 sm:mt-0 items-center justify-end w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full sm:w-auto"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Importar CSV/JSON</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateProperty}
            className="flex items-center justify-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nueva Propiedad</span>
          </motion.button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => {
          const statusInfo = getStatusInfo(property.status);
          return (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col"
            >
              {/* Property Image */}
              <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                {property.images && property.images[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/casa-moderna.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Property Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {property.title}
                </h3>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  {formatPrice(property.price)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {property.location} - {property.type}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{property.bedrooms} hab.</span>
                  <span>{property.bathrooms} baños</span>
                  <span>{property.area} m²</span>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="p-2 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(property)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    ID: {property.id}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal for Create/Edit Property */}
      <PropertyFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={fetchProperties}
        initialData={editingProperty}
      />

      {/* Modal for Importing Properties via CSV/JSON */}
      <ImportPropertiesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchProperties}
      />
    </div>
  );
};

export default PropertyManagement;
