import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { PropertyCard, PropertyCardSkeleton } from '../property/PropertyCard';
import { useNavigate } from 'react-router-dom';
import type { Property } from '../../types';

export default function FavoritesPanel() {
    const [favorites, setFavorites] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const apiService = useAuthenticatedFetch();
    const navigate = useNavigate();

    const loadFavorites = async () => {
        setLoading(true);
        try {
            const data = await apiService.getFavorites();
            setFavorites(data);
        } catch (error) {
            console.error('Error loading favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFavorites();
    }, []);

    const handleViewDetails = (id: number) => {
        navigate(`/property/${id}`);
    };

    const handleToggleFavorite = async (id: number) => {
        try {
            await apiService.toggleFavorite(id);
            // Refresh list after toggling
            loadFavorites();
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                    <PropertyCardSkeleton key={n} />
                ))}
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-4">
                    <HeartIcon className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Aún no tienes favoritos
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm px-4">
                    Guarda las propiedades que más te gusten para verlas aquí más tarde.
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
                    Mis Propiedades Favoritas
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {favorites.length} {favorites.length === 1 ? 'propiedad' : 'propiedades'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((property) => (
                    <PropertyCard
                        key={property.id}
                        property={property}
                        onViewDetails={handleViewDetails}
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={true}
                    />
                ))}
            </div>
        </div>
    );
}
