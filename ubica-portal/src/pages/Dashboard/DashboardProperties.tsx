import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  BanknotesIcon,
  KeyIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuthenticatedFetch, useAuth } from '../../contexts/AuthContext';
import type { Property } from '../../types';
import PropertyFormModal from '../../components/common/PropertyFormModal';
import {
  PageHeader,
  PageStack,
  Section,
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
  iconButtonClass,
  propertyStatusTone,
} from '../../components/dashboard/ui';
import { getStatusLabel } from '../../utils/propertyStatus';

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

  const translateStatus = getStatusLabel;

  const header = (
    <PageHeader
      title={t('dashboard.properties')}
      description="Gestiona tu portafolio de propiedades"
      actions={
        <button type="button" onClick={handleCreateProperty} className={buttonClass.primary}>
          <PlusIcon className="h-5 w-5" />
          Agregar propiedad
        </button>
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

      {/* Stats Summary */}
      <StatGrid cols={3}>
        <StatCard
          label="Propiedades vendidas"
          value={properties.filter(p => p.status === 'sold').length}
          hint="Total de ventas realizadas"
          icon={BanknotesIcon}
          tone="neutral"
        />
        <StatCard
          label="Propiedades alquiladas"
          value={properties.filter(p => p.status === 'rented').length}
          hint="Generando ingresos mensuales"
          icon={KeyIcon}
          tone="neutral"
        />
        <StatCard
          label="Propiedades en venta"
          value={properties.filter(p => p.status === 'for-sale' || p.status === 'for-rent').length}
          hint="Listas para venta o alquiler"
          icon={BuildingOfficeIcon}
        />
      </StatGrid>

      {/* Properties Table */}
      <Section
        title="Listado"
        flush
        actions={
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
            <FunnelIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {[
              { key: 'all', label: 'Todas' },
              { key: 'for-sale', label: 'En venta' },
              { key: 'for-rent', label: 'En alquiler' },
              { key: 'sold', label: 'Vendidas' },
              { key: 'rented', label: 'Alquiladas' },
              { key: 'in-use', label: 'En uso' },
              { key: 'reserved', label: 'Reservadas' }
            ].map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => setFilter(item.key)}
                aria-pressed={filter === item.key}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === item.key
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/30 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {filteredProperties.length === 0 ? (
          <EmptyState
            bare
            icon={BuildingOfficeIcon}
            title={properties.length === 0 ? 'Todavía no has añadido ninguna propiedad.' : 'Ninguna propiedad con este estado.'}
            action={properties.length === 0 ? (
              <button type="button" onClick={handleCreateProperty} className={buttonClass.primary}>
                <PlusIcon className="h-5 w-5" />
                Agregar propiedad
              </button>
            ) : undefined}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Propiedad</Th>
                <Th>Ubicación</Th>
                <Th align="right">Precio</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </THead>
            <TBody>
              {filteredProperties.map((property) => (
                <Tr key={property.id}>
                  <Td>
                    <div className="font-medium text-gray-900 dark:text-white">{property.title}</div>
                    <div className="text-gray-500 dark:text-gray-400">{property.type}</div>
                  </Td>
                  <Td>{property.location}</Td>
                  <Td align="right" className="font-semibold tabular-nums text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0
                    }).format(property.price)}
                  </Td>
                  <Td>
                    <Badge tone={propertyStatusTone(property.status)}>{translateStatus(property.status)}</Badge>
                  </Td>
                  <Td className="tabular-nums">
                    {property.created_at ? new Date(property.created_at).toLocaleDateString('es-ES') : ''}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/property/${property.id}`)}
                        title="Ver en web"
                        aria-label={`Ver ${property.title} en la web`}
                        className={iconButtonClass.brand}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {(user?.role === 'admin' || user?.id === property.owner_id) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditProperty(property)}
                            title="Editar"
                            aria-label={`Editar ${property.title}`}
                            className={iconButtonClass.neutral}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProperty(property)}
                            title="Eliminar"
                            aria-label={`Eliminar ${property.title}`}
                            className={iconButtonClass.danger}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Section>

      {/* Property Modal */}
      <PropertyFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={loadProperties}
        initialData={editingProperty}
      />
    </PageStack>
  );
}
