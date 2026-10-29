import { useState } from 'react';
import { Link } from 'react-router-dom';
import { propertyPath } from '../../seo/pages';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  HomeIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../../hooks/useLanguage';
import { getTypeLabel, normalizeType } from '../../utils/propertyStatus';
import type { Property } from '../../types';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
  isFavorite?: boolean;
  variant?: 'grid' | 'list';
}

export function PropertyCard({
  property,
  onViewDetails,
  onToggleFavorite,
  isFavorite = false,
  variant = 'grid'
}: PropertyCardProps) {
  const { t } = useLanguage();

  // Inicializamos con las imágenes que no están vacías (pero aún no sabemos si existen en el servidor)
  const initialValidImages = property.images?.filter(img => img && typeof img === 'string' && img.trim() !== '') || [];

  const [validImages, setValidImages] = useState<string[]>(initialValidImages);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Estados de oferta en el verde de marca; reservada en ámbar; cerradas en gris
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for-sale':
      case 'for-rent':
      case 'available':
        return 'bg-white/95 text-emerald-800 dark:bg-gray-900/90 dark:text-emerald-300';
      case 'reserved':
        return 'bg-amber-50/95 text-amber-800 dark:bg-amber-950/90 dark:text-amber-300';
      default:
        return 'bg-gray-100/95 text-gray-700 dark:bg-gray-900/90 dark:text-gray-300';
    }
  };

  const pricePerM2 = property.area > 0 && property.price > 0 ? Math.round(property.price / property.area) : null;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    // Si falla la carga de una imagen, la eliminamos de validImages
    setValidImages(prev => {
      const newValidImages = prev.filter((_, idx) => idx !== currentImageIndex);

      // Si nos hemos quedado sin imágenes validas o el índice actual está fuera de rango, resetear indice
      if (currentImageIndex >= newValidImages.length) {
        setCurrentImageIndex(Math.max(0, newValidImages.length - 1));
      }
      return newValidImages;
    });
    setImageLoading(false);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Prevenimos propagación o comportamiento extraño
    if (validImages.length <= 1) return;

    if (isLeftSwipe) {
      setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
    }
    if (isRightSwipe) {
      setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${property.title}, ${formatPrice(property.price)}`}
      onClick={() => onViewDetails(property.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onViewDetails(property.id); }}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:bg-gray-800 ${variant === 'list' ? 'flex flex-col sm:flex-row' : ''
        }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Image */}
      <div
        className={`relative ${variant === 'list' ? 'aspect-video sm:aspect-square sm:w-48 lg:w-64' : 'aspect-[4/3] sm:aspect-video w-full'} overflow-hidden flex-shrink-0`}
      >
        {imageLoading && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
        )}

        {validImages.length > 0 ? (
          <>
            <img
              key={currentImageIndex}
              src={validImages[currentImageIndex]}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {validImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1 text-gray-800 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1 text-gray-800 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 space-x-1">
                  {validImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-50 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800">
            <div className="rounded-full bg-white/60 dark:bg-gray-600/40 p-4 mb-2 shadow-inner">
              <HomeIcon className="h-10 w-10 text-emerald-400 dark:text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">
              Sin imagen
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute left-3 top-3">
          <span className={`rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${getStatusColor(property.status)}`}>
            {t(`status.${property.status}`)}
          </span>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            className="absolute right-3 top-3 rounded-full bg-white/80 p-2 backdrop-blur-sm transition-colors hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isFavorite ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            )}
          </motion.button>
        )}
      </div>

      {/* Content: primero el precio, luego qué es y dónde está */}
      <div className={`p-4 flex flex-col flex-1 min-w-0 gap-1 ${variant === 'list' ? 'justify-center' : ''}`}>
        <div className="flex items-baseline flex-wrap gap-x-2">
          <span className="font-display text-xl md:text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {formatPrice(property.price)}
          </span>
          {pricePerM2 && property.status !== 'for-rent' && (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatPrice(pricePerM2)}/m²</span>
          )}
        </div>
        <h3 className="font-sans text-sm md:text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
          <Link to={propertyPath(property)} onClick={(e) => e.stopPropagation()} tabIndex={-1} className="text-inherit no-underline">
            {property.title}
          </Link>
        </h3>
        {property.location?.trim() && (
          <div className="flex items-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
            <MapPinIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{property.location}</span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs md:text-sm text-gray-700 dark:text-gray-300 tabular-nums">
          {[
            t(`property.${normalizeType(property.type)}`, getTypeLabel(property.type)),
            property.bedrooms > 0 ? `${property.bedrooms} hab.` : null,
            property.bathrooms > 0 ? `${property.bathrooms} baños` : null,
            property.area > 0 ? `${property.area} m²` : null,
          ].filter(Boolean).map((item, i) => (
            // El separador va con su dato para que no quede colgando al partir la línea
            <span key={i} className="whitespace-nowrap">
              {i > 0 && <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-0 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="aspect-video w-full rounded-t-xl bg-gray-200 dark:bg-gray-700"></div>
      <div className="p-4 space-y-3">
        <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex justify-between">
          <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
