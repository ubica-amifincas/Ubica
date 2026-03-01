import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, String(value));
        });
        navigate(`/?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    if (searches.length === 0) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-4">
                    <MagnifyingGlassIcon className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No tienes búsquedas guardadas
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm px-4">
                    Guarda tus criterios de búsqueda favoritos para acceder a ellos rápidamente.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    Ir a Propiedades
                </button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Mis Búsquedas Guardadas
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {searches.length} {searches.length === 1 ? 'búsqueda' : 'búsquedas'}
                </span>
            </div>

            <div className="grid gap-4">
                {searches.map((search) => (
                    <motion.div
                        key={search.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                        whileHover={{ x: 5 }}
                    >
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {search.name || 'Búsqueda sin nombre'}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {Object.entries(search.filters).map(([key, value]) => (
                                    value && value !== '' && (
                                        <span key={key} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                                            {key}: {String(value)}
                                        </span>
                                    )
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => handleRunSearch(search.filters)}
                                className="flex items-center space-x-1 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                <span>Ejecutar</span>
                            </button>
                            <button
                                onClick={() => handleDeleteSearch(search.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
