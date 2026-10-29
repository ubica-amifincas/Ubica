import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
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
  // Revisión de anuncios de particulares, inversores e inmobiliarias sin aprobar
  const [view, setView] = useState<'all' | 'review'>('all');
  const [rejecting, setRejecting] = useState<{ id: number; note: string } | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [ownerEmails, setOwnerEmails] = useState<Record<number, string>>({});
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
    // Para saber de quién es cada anuncio pendiente
    apiService.getAllUsers()
      .then(users => setOwnerEmails(Object.fromEntries(users.map(u => [u.id, u.email]))))
      .catch(() => { /* sin la lista se muestra el id del propietario */ });
  }, []);

  const review = async (property: Property, decision: 'approve' | 'reject', note = '') => {
    setReviewError('');
    try {
      await apiService.updateProperty(property.id, decision === 'approve'
        ? { status: property.pendingStatus || 'for-sale' }
        : { status: 'rejected', reviewNote: note.trim() });
      setRejecting(null);
      await fetchProperties(true);
    } catch (error: any) {
      setReviewError(error.message || 'No se pudo guardar la revisión');
    }
  };

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

  const pending = properties.filter(p => p.status === 'pending-review');
  const shown = view === 'review' ? pending : properties;
  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${active
      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`;

  return (
    <PageStack>
      {header}

      {properties.length > 0 && (
        <div role="tablist" aria-label="Filtrar propiedades" className="inline-flex gap-1 self-start rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button type="button" role="tab" aria-selected={view === 'all'} onClick={() => setView('all')} className={tabClass(view === 'all')}>
            Todas <span className="tabular-nums text-gray-500 dark:text-gray-400">{properties.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={view === 'review'} onClick={() => setView('review')} className={tabClass(view === 'review')}>
            Pendientes de revisión{' '}
            <span className={`tabular-nums ${pending.length > 0 ? 'rounded-full bg-amber-100 px-1.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
              {pending.length}
            </span>
          </button>
        </div>
      )}
      {reviewError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{reviewError}</p>}

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
      ) : shown.length === 0 ? (
        <EmptyState icon={CheckIcon} title="No hay anuncios pendientes de revisión." />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((property) => {
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
                    {property.bedrooms != null && <span>{property.bedrooms} hab.</span>}
                    {property.bathrooms != null && <span>{property.bathrooms} {property.bathrooms === 1 ? 'baño' : 'baños'}</span>}
                    {property.area != null && <span>{property.area} m²</span>}
                  </div>

                  {property.status === 'rejected' && property.reviewNote && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-400">Motivo: {property.reviewNote}</p>
                  )}

                  {/* Revisión: se publica con el estado que pidió el anunciante, o se rechaza con un motivo que verá */}
                  {property.status === 'pending-review' && (
                    <div className="mt-3 space-y-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
                      <p className="text-amber-900 dark:text-amber-200">
                        Pide publicarlo como <strong>{getStatusLabel(property.pendingStatus || 'for-sale').toLowerCase()}</strong>
                        {property.owner_id != null && <> · {ownerEmails[property.owner_id] || `usuario ${property.owner_id}`}</>}
                      </p>
                      {rejecting?.id === property.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); review(property, 'reject', rejecting.note); }} className="space-y-2">
                          <label htmlFor={`reject-${property.id}`} className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Motivo (lo verá el anunciante)
                          </label>
                          <textarea id={`reject-${property.id}`} rows={2} maxLength={500} autoFocus value={rejecting.note}
                            onChange={(e) => setRejecting({ id: property.id, note: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          <div className="flex gap-2">
                            <button type="submit" className={buttonClass.danger}>Rechazar</button>
                            <button type="button" onClick={() => setRejecting(null)} className={buttonClass.secondary}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => review(property, 'approve')} className={buttonClass.primary}>
                            <CheckIcon className="h-4 w-4" /> Publicar
                          </button>
                          <button type="button" onClick={() => setRejecting({ id: property.id, note: '' })} className={buttonClass.secondary}>
                            <XMarkIcon className="h-4 w-4" /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
