import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';
import PropertyFormModal from '../common/PropertyFormModal';
import { ImportPropertiesModal } from './ImportPropertiesModal';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { getTypeLabel, getStatusLabel } from '../../utils/propertyStatus';
import {
  PageHeader,
  PageStack,
  Card,
  EmptyState,
  LoadingState,
  Badge,
  buttonClass,
  iconButtonClass,
  propertyStatusTone,
} from '../dashboard/ui';

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

  // silent: refresca la lista sin pasar por la pantalla de carga (que cerraría los diálogos abiertos)
  const fetchProperties = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
    return {
      label: getStatusLabel(status),
      tone: propertyStatusTone(status),
    };
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const header = (
    <PageHeader
      title="Propiedades"
      description="Administra el catálogo de propiedades del sistema"
      actions={
        <>
          <button type="button" onClick={() => setShowImportModal(true)} className={buttonClass.secondary}>
            <ArrowDownTrayIcon className="h-5 w-5" />
            Importar CSV/JSON
          </button>
          <button type="button" onClick={handleCreateProperty} className={buttonClass.primary}>
            <PlusIcon className="h-5 w-5" />
            Nueva propiedad
          </button>
        </>
      }
    />
  );

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  return (
    <PageStack>
      {header}

      {properties.length === 0 ? (
        <EmptyState
          icon={BuildingOfficeIcon}
          title="Todavía no hay propiedades en el catálogo."
          action={
            <button type="button" onClick={handleCreateProperty} className={buttonClass.primary}>
              <PlusIcon className="h-5 w-5" />
              Nueva propiedad
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const statusInfo = getStatusInfo(property.status);
            return (
              <Card key={property.id} className="flex flex-col overflow-hidden">
                {/* Property Image */}
                <div className="relative h-44 bg-gray-100 dark:bg-gray-700">
                  {property.images && property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/casa-moderna.jpg';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PhotoIcon className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  </div>
                </div>

                {/* Property Info */}
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatPrice(property.price)}
                  </p>
                  <h3 className="mt-1 font-medium text-gray-900 dark:text-white">{property.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {[property.location, getTypeLabel(property.type)].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{property.bedrooms} hab.</span>
                    <span>{property.bathrooms} {property.bathrooms === 1 ? 'baño' : 'baños'}</span>
                    <span>{property.area} m²</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditProperty(property)}
                        className={iconButtonClass.brand}
                        title="Editar"
                        aria-label={`Editar ${property.title}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProperty(property)}
                        className={iconButtonClass.danger}
                        title="Eliminar"
                        aria-label={`Eliminar ${property.title}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs tabular-nums text-gray-400">ID: {property.id}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal for Create/Edit Property */}
      <PropertyFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => fetchProperties(true)}
        initialData={editingProperty}
      />

      {/* Modal for Importing Properties via CSV/JSON */}
      <ImportPropertiesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => fetchProperties(true)}
      />
    </PageStack>
  );
};

export default PropertyManagement;
