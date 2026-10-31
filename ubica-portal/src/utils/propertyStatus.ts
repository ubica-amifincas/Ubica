/** Etiquetas en español para los estados de una propiedad. Los estados desconocidos se muestran tal cual. */
const STATUS_LABELS: Record<string, string> = {
  'for-sale': 'En venta',
  'for-rent': 'En alquiler',
  reserved: 'Reservada',
  sold: 'Vendida',
  rented: 'Alquilada',
  available: 'Disponible',
  'under-renovation': 'En reforma',
  'in-use': 'En uso',
  pending: 'Pendiente',
  draft: 'Borrador',
  'pending-review': 'Pendiente de revisión',
  rejected: 'Rechazado',
};

export function getStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status;
}

/** Plural para recuentos ("Vendidas", "En venta"...). */
const STATUS_LABELS_PLURAL: Record<string, string> = {
  'for-sale': 'En venta',
  'for-rent': 'En alquiler',
  reserved: 'Reservadas',
  sold: 'Vendidas',
  rented: 'Alquiladas',
  available: 'Disponibles',
  'under-renovation': 'En reforma',
  'in-use': 'En uso',
  pending: 'Pendientes',
  draft: 'Borradores',
  'pending-review': 'Pendientes de revisión',
  rejected: 'Rechazados',
};

export function getStatusLabelPlural(status?: string | null): string {
  if (!status) return 'Sin estado';
  return STATUS_LABELS_PLURAL[status] ?? status;
}

/** Tipos de inmueble: la misma clave que guarda el backend y que usan las traducciones (property.<clave>). */
export const PROPERTY_TYPES = [
  { value: 'flat', label: 'Piso' },
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'townhouse', label: 'Adosado' },
  { value: 'villa', label: 'Villa' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'penthouse', label: 'Ático' },
  { value: 'duplex', label: 'Dúplex' },
  { value: 'studio', label: 'Estudio' },
  { value: 'land', label: 'Terreno' },
  { value: 'commercial', label: 'Local comercial' },
] as const;

// Formas antiguas o en español que aún hay en la base de datos
const TYPE_ALIASES: Record<string, string> = {
  apartamento: 'apartment', piso: 'flat', casa: 'house', atico: 'penthouse', 'ático': 'penthouse',
  adosado: 'townhouse', 'casa adosada': 'townhouse', estudio: 'studio', 'dúplex': 'duplex',
  terreno: 'land', parcela: 'land', solar: 'land',
  local: 'commercial', 'local comercial': 'commercial', 'bajo comercial': 'commercial', locales: 'commercial',
};

/** "Apartamento", "piso", "Ático"... -> la clave común ("apartment", "flat", "penthouse"). */
export function normalizeType(type?: string | null): string {
  const key = (type ?? '').trim().toLowerCase();
  return TYPE_ALIASES[key] ?? key;
}

/** Tipo de inmueble en español ("penthouse" → "Ático"). */
export function getTypeLabel(type?: string | null): string {
  if (!type) return '';
  const key = normalizeType(type);
  return PROPERTY_TYPES.find(t => t.value === key)?.label ?? type;
}

/** Estados visibles en el portal (deben coincidir con PUBLIC_STATUSES del backend). */
export const PUBLIC_STATUSES = ['for-sale', 'for-rent', 'reserved', 'available'];

/** El admin y las inmobiliarias aprobadas publican sin revisión; el resto pasa por el admin. */
export const publishesDirectly = (user?: { role?: string; is_approved?: boolean } | null) =>
  !!user && (user.role === 'admin' || (user.role === 'realtor' && user.is_approved !== false));

/** Estados que se eligen en el formulario de un inmueble. */
export const PROPERTY_STATUS_OPTIONS = ['draft', 'for-sale', 'for-rent', 'reserved', 'sold', 'rented', 'under-renovation', 'in-use']
  // Borrador: solo lo ven su dueño, su inmobiliaria y el admin; no sale en el portal
  .map(value => ({ value, label: value === 'draft' ? 'Borrador (sin publicar)' : getStatusLabel(value) }));
