import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  HomeIcon,
  CurrencyEuroIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import PropertyFormModal from '../../components/common/PropertyFormModal';
import { getStatusLabel, getTypeLabel } from '../../utils/propertyStatus';
import type { Property as ApiProperty } from '../../types';
import {
  PageHeader,
  PageStack,
  Section,
  Card,
  StatCard,
  StatGrid,
  EmptyState,
  LoadingState,
  Badge,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  buttonClass,
  propertyStatusTone,
  formatEur,
  PropertyImage,
} from '../../components/dashboard/ui';

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

export type RealtorSection = 'overview' | 'properties' | 'analytics';

const eur = formatEur;

/**
 * Panel de la inmobiliaria. La sección activa la decide la ruta
 * (/realtor, /realtor/propiedades, /realtor/estadisticas). Alquileres y ventas usan las páginas
 * comunes de /dashboard, que para la inmobiliaria incluyen también los inmuebles asignados.
 */
const RealtorDashboardComplete: React.FC<{ section?: RealtorSection }> = ({ section = 'overview' }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

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
    portfolioValue: properties.filter(p => AVAILABLE_STATUSES.includes(p.status)).reduce((sum, p) => sum + p.price, 0),
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

  const getStatusText = getStatusLabel;

  const addButton = (
    <button type="button" onClick={() => handleEditProperty(null)} className={buttonClass.primary}>
      <PlusIcon className="h-5 w-5" />
      Añadir propiedad
    </button>
  );

  const headers: Record<RealtorSection, { title: string; description?: string; actions?: React.ReactNode }> = {
    overview: { title: 'Panel de inmobiliaria', description: `Bienvenido de vuelta, ${user?.full_name || 'Inmobiliaria'}`, actions: addButton },
    properties: { title: `Cartera de inmuebles (${properties.length})`, description: 'Inmuebles propios y asignados por el administrador', actions: addButton },
    analytics: { title: 'Estadísticas y análisis' },
  };
  const header = <PageHeader {...headers[section]} />;

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

      {section === 'overview' && (
        <>
          <StatGrid cols={4}>
            <StatCard label="Total propiedades" value={stats.totalProperties} icon={HomeIcon} />
            <StatCard label="Disponibles" value={stats.availableProperties} icon={CheckCircleIcon} />
            <StatCard label="Vendidas" value={stats.soldProperties} icon={CurrencyEuroIcon} tone="neutral" />
            <StatCard label="Alquiladas" value={stats.rentedProperties} icon={KeyIcon} tone="neutral" />
          </StatGrid>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Últimos inmuebles" flush>
              {properties.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">Todavía no tienes inmuebles en cartera.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...properties].sort((x, y) => y.dateAdded.localeCompare(x.dateAdded)).slice(0, 4).map((property) => (
                    <li key={property.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <Link to={`/property/${property.id}`} className="block truncate text-sm font-medium text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                          {property.title}
                        </Link>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{property.location || getTypeLabel(property.type)}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{eur(property.price)}</span>
                        <Badge tone={propertyStatusTone(property.status)}>{getStatusText(property.status)}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Estado de propiedades"
              actions={<Link to="/realtor/propiedades" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">Ver cartera</Link>}
            >
              <dl className="space-y-3 text-sm">
                {[
                  ['Disponibles', stats.availableProperties],
                  ['Vendidas', stats.soldProperties],
                  ['Alquiladas', stats.rentedProperties],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
                    <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>
        </>
      )}

      {section === 'properties' && (
        properties.length === 0 ? (
          <EmptyState
            icon={HomeIcon}
            title="Todavía no tienes inmuebles en tu cartera."
            description="Publica tu primer inmueble o pide al administrador que te asigne los que gestionas."
            action={addButton}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <Card key={property.id} className="flex flex-col overflow-hidden">
                <PropertyImage src={property.images[0]} alt={property.title} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                      {eur(property.price)}
                    </p>
                    <Badge tone={propertyStatusTone(property.status)}>{getStatusText(property.status)}</Badge>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{property.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{property.location}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>{property.area} m²</div>
                    <div>{property.bedrooms} hab.</div>
                    <div>{property.bathrooms} {property.bathrooms === 1 ? 'baño' : 'baños'}</div>
                  </div>
                  <div className="mt-auto pt-4">
                    {!property.canEdit && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Asignada por el administrador · solo lectura</p>
                    )}
                    {property.canEdit && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditProperty(property)} className={`${buttonClass.secondary} flex-1 px-3`}>
                          <PencilIcon className="h-4 w-4" />
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDeleteProperty(property)} className={`${buttonClass.danger} flex-1 px-3`}>
                          <TrashIcon className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {section === 'analytics' && <AnalyticsView stats={stats} properties={properties} />}

      <PropertyFormModal
        isOpen={showPropertyForm}
        onClose={() => { setShowPropertyForm(false); setEditingProperty(null); }}
        onSave={() => { setShowPropertyForm(false); setEditingProperty(null); loadProperties(); }}
        initialData={editingProperty?.raw ?? null}
      />
    </PageStack>
  );
};

// Analytics View Component
const AnalyticsView: React.FC<{
  stats: any;
  properties: Property[];
}> = ({ stats, properties }) => (
  <>
    <StatGrid cols={3}>
      <StatCard label="Valor en el mercado" value={eur(stats.portfolioValue)} hint="Disponibles, a precio publicado" icon={CurrencyEuroIcon} />
      <StatCard label="Precio promedio" value={eur(stats.averagePropertyPrice)} hint="Por propiedad" icon={HomeIcon} />
      <StatCard
        label="Tasa de conversión"
        value={`${properties.length > 0 ? Math.round(((stats.soldProperties + stats.rentedProperties) / properties.length) * 100) : 0}%`}
        hint="Propiedades vendidas/alquiladas"
        icon={ArrowTrendingUpIcon}
      />
    </StatGrid>

    <Section title="Distribución de propiedades por estado">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Disponibles', stats.availableProperties],
          ['Vendidas', stats.soldProperties],
          ['Alquiladas', stats.rentedProperties],
          ['Pendientes', properties.filter(p => p.status === 'pending').length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/40">
            <p className="font-display text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </Section>
  </>
);

export default RealtorDashboardComplete;
