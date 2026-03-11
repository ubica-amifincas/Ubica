import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  HomeIcon,
  BanknotesIcon,
  EyeIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../../hooks/useLanguage';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for-sale':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'for-rent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'sold':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'rented':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'reserved':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

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
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-800 ${variant === 'list' ? 'flex flex-col sm:flex-row' : ''
        }`}
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Image */}
      <div
        className={`relative cursor-pointer ${variant === 'list' ? 'aspect-video sm:aspect-square sm:w-48 lg:w-64' : 'aspect-[4/3] sm:aspect-video w-full'} overflow-hidden flex-shrink-0`}
        onClick={() => onViewDetails(property.id)}
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
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
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
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800">
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
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(property.status)}`}>
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

      {/* Content */}
      <div className={`p-3 md:p-4 flex flex-col flex-1 min-w-0 ${variant === 'list' ? 'justify-between' : ''}`}>
        <div>
          {/* Title and Location */}
          <div className="mb-1.5 md:mb-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                {property.title}
              </h3>
            </div>
            <div className="flex items-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
              <MapPinIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{property.location}</span>
            </div>
          </div>

          {/* Property Type and Details */}
          <div className="mb-2 md:mb-3 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] text-[#4a9d78] dark:text-[#45b894]">
            {t(`property.${property.type.toLowerCase()}`, property.type)}
          </div>
          <div className="mb-2 md:mb-4 flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 md:gap-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center">
              <span className="font-bold">{property.bedrooms}</span>
              <span className="ml-1 text-xs">{t('details.bedrooms')}</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold">{property.bathrooms}</span>
              <span className="ml-1 text-xs">{t('details.bathrooms')}</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold">{property.area}</span>
              <span className="ml-1 text-xs">m²</span>
            </div>
          </div>

          {/* Features - Hidden or simplified in list view if space is tight */}
          {property.features?.length > 0 && variant === 'grid' && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {property.features.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price and Action */}
          <div className={`mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 border-t border-gray-100 pt-2 md:pt-3 dark:border-gray-700 ${variant === 'list' ? 'sm:border-t-0 sm:pt-0' : ''}`}>
            <div className="flex items-center">
              <BanknotesIcon className="mr-1 h-4 w-4 md:h-5 md:w-5 text-[#4a9d78]" />
              <span className="text-base md:text-xl font-bold text-gray-900 dark:text-white">
                {formatPrice(property.price)}
              </span>
            </div>

            <motion.button
              onClick={() => onViewDetails(property.id)}
              className="flex items-center justify-center space-x-1 w-full sm:w-auto rounded-lg bg-[#4a9d78] px-2.5 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-semibold text-white transition-colors hover:bg-[#3a8d68] focus:outline-none shadow-sm hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <EyeIcon className="h-3.5 w-3.5" />
              <span>{t('details.viewDetails')}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
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
