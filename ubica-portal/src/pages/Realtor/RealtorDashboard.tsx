import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  HomeIcon,
  CurrencyEuroIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import PropertyFormModal from '../../components/common/PropertyFormModal';
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

export type RealtorSection = 'overview' | 'properties' | 'rentals' | 'sales' | 'analytics';

const eur = formatEur;

/**
 * Panel de la inmobiliaria. La sección activa la decide la ruta
 * (/realtor, /realtor/propiedades, /realtor/alquileres, /realtor/ventas, /realtor/estadisticas).
 */
const RealtorDashboardComplete: React.FC<{ section?: RealtorSection }> = ({ section = 'overview' }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [rentals] = useState<RentalContract[]>([]);
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

  const addButton = (
    <button type="button" onClick={() => handleEditProperty(null)} className={buttonClass.primary}>
      <PlusIcon className="h-5 w-5" />
      Añadir propiedad
    </button>
  );

  const headers: Record<RealtorSection, { title: string; description?: string; actions?: React.ReactNode }> = {
    overview: { title: 'Panel de inmobiliaria', description: `Bienvenido de vuelta, ${user?.full_name || 'Inmobiliaria'}`, actions: addButton },
    properties: { title: `Cartera de inmuebles (${properties.length})`, description: 'Inmuebles propios y asignados por el administrador', actions: addButton },
    rentals: { title: `Contratos de alquiler (${rentals.length})` },
    sales: { title: `Ventas completadas (${transactions.filter(t => t.type === 'sale').length})` },
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
            <StatCard label="Comisiones totales" value={eur(stats.totalCommissions)} icon={CurrencyEuroIcon} tone="neutral" />
            <StatCard label="Ingresos mensuales" value={eur(stats.monthlyRentalIncome)} icon={ArrowTrendingUpIcon} tone="neutral" />
          </StatGrid>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Transacciones recientes">
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay transacciones registradas.</p>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{transaction.propertyTitle}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.type === 'sale' ? 'Venta' : 'Alquiler'} • {transaction.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">+{eur(transaction.commission)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">comisión</p>
                      </div>
                    </div>
                  ))}
                </div>
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

      {section === 'rentals' && <RentalsView rentals={rentals} />}

      {section === 'sales' && <SalesView transactions={transactions.filter(t => t.type === 'sale')} />}

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

// Rentals View Component
const RentalsView: React.FC<{ rentals: RentalContract[] }> = ({ rentals }) => (
  <Section title="Contratos" flush>
    {rentals.length === 0 ? (
      <EmptyState bare icon={CalendarIcon} title="Todavía no hay contratos de alquiler registrados." />
    ) : (
      <Table>
        <THead>
          <tr>
            <Th>Propiedad</Th>
            <Th>Inquilino</Th>
            <Th align="right">Renta mensual</Th>
            <Th>Próximo pago</Th>
            <Th>Estado</Th>
          </tr>
        </THead>
        <TBody>
          {rentals.map((rental) => (
            <Tr key={rental.id}>
              <Td className="font-medium text-gray-900 dark:text-white">{rental.propertyTitle}</Td>
              <Td>{rental.tenantName}</Td>
              <Td align="right" className="font-semibold tabular-nums text-gray-900 dark:text-white">{eur(rental.monthlyRent)}</Td>
              <Td>{rental.nextPayment}</Td>
              <Td>
                <Badge tone={rental.status === 'active' ? 'brand' : 'neutral'}>{rental.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    )}
  </Section>
);

// Sales View Component
const SalesView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
  <Section title="Operaciones" flush>
    {transactions.length === 0 ? (
      <EmptyState bare icon={DocumentTextIcon} title="Todavía no hay ventas registradas." />
    ) : (
      <Table>
        <THead>
          <tr>
            <Th>Propiedad</Th>
            <Th>Cliente</Th>
            <Th align="right">Precio de venta</Th>
            <Th align="right">Comisión</Th>
            <Th>Fecha</Th>
          </tr>
        </THead>
        <TBody>
          {transactions.map((transaction) => (
            <Tr key={transaction.id}>
              <Td className="font-medium text-gray-900 dark:text-white">{transaction.propertyTitle}</Td>
              <Td>{transaction.clientName}</Td>
              <Td align="right" className="font-semibold tabular-nums text-gray-900 dark:text-white">{eur(transaction.amount)}</Td>
              <Td align="right" className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{eur(transaction.commission)}</Td>
              <Td>{transaction.date}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    )}
  </Section>
);

// Analytics View Component
const AnalyticsView: React.FC<{
  stats: any;
  properties: Property[];
}> = ({ stats, properties }) => (
  <>
    <StatGrid cols={3}>
      <StatCard label="Ingresos por comisiones" value={eur(stats.totalCommissions)} hint="Total acumulado" icon={CurrencyEuroIcon} />
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
