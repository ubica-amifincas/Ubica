import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStatusLabel, getTypeLabel } from '../../utils/propertyStatus';
import { EmptyState, Card, buttonClass, iconButtonClass } from './ui';


const formatEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** Convierte los filtros guardados en un texto legible: "Murcia · hasta 1.000.000 €". */
function describeFilters(filters: Record<string, unknown> | null | undefined): string {
    if (!filters || typeof filters !== 'object') return '';
    const f = filters as Record<string, any>;
    const parts: string[] = [];
    const term = typeof f.searchTerm === 'string' ? f.searchTerm.trim() : '';
    if (term) parts.push(`"${term}"`);
    if (f.location) parts.push(String(f.location));
    if (f.type) parts.push(getTypeLabel(String(f.type)));
    if (f.status) parts.push(getStatusLabel(String(f.status)));
    const min = Number(f.minPrice) || 0;
    const max = Number(f.maxPrice) || 0;
    if (min > 0 && max > 0) parts.push(`${formatEur(min)} – ${formatEur(max)}`);
    else if (min > 0) parts.push(`desde ${formatEur(min)}`);
    else if (max > 0) parts.push(`hasta ${formatEur(max)}`);
    const beds = Number(f.bedrooms) || 0;
    if (beds > 0) parts.push(`${beds}+ ${beds === 1 ? 'habitación' : 'habitaciones'}`);
    return parts.join(' · ');
}

interface SavedSearch {
    id: number;
    name: string;
    filters: any;
    created_at?: string;
}

export default function SavedSearchesPanel() {
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const apiService = useAuthenticatedFetch();
    const navigate = useNavigate();

    const loadSearches = async () => {
        setLoading(true);
        try {
            const data = await apiService.getSearches();
            setSearches(data);
        } catch (error) {
            console.error('Error loading searches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSearches();
    }, []);

    const handleDeleteSearch = async (id: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta búsqueda guardada?')) return;
        try {
            await apiService.deleteSearch(id);
            loadSearches();
        } catch (error) {
            console.error('Error deleting search:', error);
        }
    };

    const handleRunSearch = (filters: any) => {
        // Convert filters to query params and navigate to properties page
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([key, value]) => {
            if (value) params.append(key, String(value));
        });
        navigate(`/?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                ))}
            </div>
        );
    }

    if (searches.length === 0) {
        return (
            <EmptyState
                icon={MagnifyingGlassIcon}
                title="No tienes búsquedas guardadas"
                description="Guarda tus criterios de búsqueda favoritos para acceder a ellos rápidamente."
                action={
                    <button type="button" onClick={() => navigate('/')} className={buttonClass.primary}>
                        Ir a propiedades
                    </button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
                {searches.length} {searches.length === 1 ? 'búsqueda' : 'búsquedas'}
            </p>

            <div className="grid gap-4">
                {searches.map((search) => (
                    <Card
                        key={search.id}
                        className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center"
                    >
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {search.name || 'Búsqueda sin nombre'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                {describeFilters(search.filters) || 'Todas las propiedades'}
                            </p>
                        </div>

                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                            <button
                                type="button"
                                onClick={() => handleRunSearch(search.filters)}
                                className={buttonClass.secondary}
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                <span>Ejecutar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteSearch(search.id)}
                                aria-label="Eliminar búsqueda"
                                title="Eliminar búsqueda"
                                className={iconButtonClass.danger}
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
