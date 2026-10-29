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
};

export function getStatusLabelPlural(status?: string | null): string {
  if (!status) return 'Sin estado';
  return STATUS_LABELS_PLURAL[status] ?? status;
}

/** Tipo de inmueble en español ("penthouse" → "Ático"). */
const TYPE_LABELS: Record<string, string> = {
  villa: 'Villa', apartment: 'Apartamento', house: 'Casa', penthouse: 'Ático', townhouse: 'Adosado',
  studio: 'Estudio', estudio: 'Estudio', duplex: 'Dúplex', piso: 'Piso', flat: 'Piso',
  terreno: 'Terreno', land: 'Terreno', chalet: 'Chalet',
};

export function getTypeLabel(type?: string | null): string {
  if (!type) return '';
  return TYPE_LABELS[type] ?? type;
}
