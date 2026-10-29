/** Etiquetas en español para los estados de una propiedad. Los estados desconocidos se muestran tal cual. */
const STATUS_LABELS: Record<string, string> = {
  'for-sale': 'En venta',
  'for-rent': 'En alquiler',
  reserved: 'Reservada',
  sold: 'Vendida',
  rented: 'Alquilada',
  available: 'Disponible',
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
};

export function getStatusLabelPlural(status?: string | null): string {
  if (!status) return 'Sin estado';
  return STATUS_LABELS_PLURAL[status] ?? status;
}
