import { useState, useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { EmptyState, buttonClass } from './ui';
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
            <EmptyState
                icon={HeartIcon}
                title="Aún no tienes favoritos"
                description="Guarda las propiedades que más te gusten para verlas aquí más tarde."
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
                {favorites.length} {favorites.length === 1 ? 'propiedad' : 'propiedades'}
            </p>

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
