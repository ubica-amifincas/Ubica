import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  MapIcon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  ShareIcon,
  EyeIcon,
  RectangleStackIcon,
  BeakerIcon,
  HomeIcon,
  CurrencyEuroIcon,
  MapPinIcon,
  StarIcon,
  XMarkIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  HomeModernIcon
} from '@heroicons/react/24/outline';
import appService from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  coordinates: { lat: number; lng: number };
  type: 'apartamento' | 'casa' | 'ático' | 'chalet' | 'estudio' | 'duplex';
  status: 'venta' | 'alquiler' | 'vendido' | 'alquilado';
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  images: string[];
  features: string[];
  agent: {
    name: string;
    phone: string;
    email: string;
    avatar: string;
  };
  rating: number;
  views: number;
  isFeatured: boolean;
  publishedDate: string;
  energyRating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  plotSize?: number;
  yearBuilt?: number;
  furnished?: boolean;
  elevator?: boolean;
  parking?: boolean;
  airConditioning?: boolean;
  heating?: boolean;
  garden?: boolean;
  pool?: boolean;
  terrace?: boolean;
  balcony?: boolean;
}

interface Filters {
  searchTerm: string;
  priceRange: [number, number];
  propertyType: string[];
  status: string[];
  bedrooms: string;
  bathrooms: string;
  areaRange: [number, number];
  location: string;
  features: string[];
  energyRating: string[];
  yearBuiltRange: [number, number];
  furnished: string;
  sortBy: 'price-asc' | 'price-desc' | 'area-asc' | 'area-desc' | 'date-desc' | 'date-asc' | 'rating-desc';
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Apartamento Moderno en el Centro',
    price: 185000,
    location: 'Murcia Centro, Murcia',
    coordinates: { lat: 37.9838, lng: -1.1278 },
    type: 'apartamento',
    status: 'venta',
    bedrooms: 3,
    bathrooms: 2,
    area: 95,
    description: 'Precioso apartamento completamente reformado en el corazón de Murcia. Cuenta con todas las comodidades modernas y una ubicación inmejorable.',
    images: ['/images/apartamento-torre-pacheco.jpg', '/images/casa-moderna.jpg'],
    features: ['Aire acondicionado', 'Ascensor', 'Balcón', 'Armarios empotrados'],
    agent: {
      name: 'María González',
      phone: '+34 968 123 456',
      email: 'maria@ubica.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
    },
    rating: 4.8,
    views: 245,
    isFeatured: true,
    publishedDate: '2024-06-01',
    energyRating: 'B',
    yearBuilt: 2020,
    furnished: false,
    elevator: true,
    parking: false,
    airConditioning: true,
    heating: true,
    garden: false,
    pool: false,
    terrace: false,
    balcony: true
  },
  {
    id: '2',
    title: 'Chalet con Piscina en La Manga',
    price: 485000,
    location: 'La Manga del Mar Menor, Murcia',
    coordinates: { lat: 37.7167, lng: -0.7333 },
    type: 'chalet',
    status: 'venta',
    bedrooms: 4,
    bathrooms: 3,
    area: 180,
    plotSize: 350,
    description: 'Espectacular chalet con piscina privada y jardín, a pocos metros de la playa. Perfecto para familias que buscan tranquilidad.',
    images: ['/images/casa-moderna.jpg', '/images/atico.jpg'],
    features: ['Piscina privada', 'Jardín', 'Parking', 'Terraza', 'Barbacoa'],
    agent: {
      name: 'Carlos Martínez',
      phone: '+34 968 789 012',
      email: 'carlos@ubica.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    rating: 4.9,
    views: 189,
    isFeatured: true,
    publishedDate: '2024-05-28',
    energyRating: 'A',
    yearBuilt: 2019,
    furnished: true,
    elevator: false,
    parking: true,
    airConditioning: true,
    heating: true,
    garden: true,
    pool: true,
    terrace: true,
    balcony: false
  },
  {
    id: '3',
    title: 'Ático con Terraza Panorámica',
    price: 295000,
    location: 'Molina de Segura, Murcia',
    coordinates: { lat: 38.0531, lng: -1.2131 },
    type: 'ático',
    status: 'venta',
    bedrooms: 2,
    bathrooms: 2,
    area: 85,
    description: 'Increíble ático con terraza de 40m² y vistas panorámicas. Totalmente exterior y muy luminoso.',
    images: ['/images/atico.jpg', '/images/apartamento-torre-pacheco.jpg'],
    features: ['Terraza 40m²', 'Vistas panorámicas', 'Muy luminoso', 'Ascensor'],
    agent: {
      name: 'Ana López',
      phone: '+34 968 345 678',
      email: 'ana@ubica.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    },
    rating: 4.7,
    views: 156,
    isFeatured: false,
    publishedDate: '2024-06-05',
    energyRating: 'B',
    yearBuilt: 2018,
    furnished: false,
    elevator: true,
    parking: true,
    airConditioning: true,
    heating: true,
    garden: false,
    pool: false,
    terrace: true,
    balcony: false
  },
  {
    id: '4',
    title: 'Casa Rural con Encanto',
    price: 320000,
    location: 'Caravaca de la Cruz, Murcia',
    coordinates: { lat: 38.1122, lng: -1.8681 },
    type: 'casa',
    status: 'venta',
    bedrooms: 5,
    bathrooms: 3,
    area: 200,
    plotSize: 1200,
    description: 'Preciosa casa rural completamente rehabilitada, manteniendo el encanto tradicional con todas las comodidades modernas.',
    images: ['/images/casa-moderna.jpg', '/images/atico.jpg'],
    features: ['Jardín amplio', 'Chimenea', 'Bodega', 'Parking cubierto', 'Huerto'],
    agent: {
      name: 'Pedro Ruiz',
      phone: '+34 968 567 890',
      email: 'pedro@ubica.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
    },
    rating: 4.6,
    views: 98,
    isFeatured: false,
    publishedDate: '2024-05-30',
    energyRating: 'C',
    yearBuilt: 1995,
    furnished: false,
    elevator: false,
    parking: true,
    airConditioning: false,
    heating: true,
    garden: true,
    pool: false,
    terrace: true,
    balcony: false
  },
  {
    id: '5',
    title: 'Apartamento para Alquiler',
    price: 650,
    location: 'El Carmen, Murcia',
    coordinates: { lat: 37.9922, lng: -1.1307 },
    type: 'apartamento',
    status: 'alquiler',
    bedrooms: 2,
    bathrooms: 1,
    area: 70,
    description: 'Cómodo apartamento en alquiler, completamente amueblado y equipado. Ideal para jóvenes profesionales.',
    images: ['/images/apartamento-torre-pacheco.jpg', '/images/casa-moderna.jpg'],
    features: ['Completamente amueblado', 'Céntrico', 'Transporte público', 'Internet incluido'],
    agent: {
      name: 'Laura Sánchez',
      phone: '+34 968 234 567',
      email: 'laura@ubica.com',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    },
    rating: 4.5,
    views: 78,
    isFeatured: false,
    publishedDate: '2024-06-08',
    energyRating: 'C',
    yearBuilt: 2010,
    furnished: true,
    elevator: true,
    parking: false,
    airConditioning: true,
    heating: true,
    garden: false,
    pool: false,
    terrace: false,
    balcony: true
  }
];

const getPropertyTypes = (t: any) => [
  { value: 'apartamento', label: t('property.apartment'), icon: BuildingOfficeIcon },
  { value: 'casa', label: t('property.house'), icon: HomeIcon },
  { value: 'ático', label: t('property.penthouse'), icon: BuildingOffice2Icon },
  { value: 'chalet', label: t('property.chalet'), icon: HomeModernIcon },
  { value: 'estudio', label: t('property.studio'), icon: BuildingOfficeIcon },
  { value: 'duplex', label: t('property.duplex'), icon: BuildingOffice2Icon }
];

const getFeaturesList = (t: any) => [
  t('filter.ac'), t('filter.lift'), t('filter.balcony'), t('filter.terrace'), t('filter.garden'), t('filter.pool'),
  t('filter.parking'), t('filter.garage'), t('filter.storage'), t('filter.fireplace'), t('filter.wardrobes'),
  t('filter.heating_floor'), t('filter.kitchen'), t('filter.furnished'), t('filter.renovated')
];

const Properties: React.FC = () => {
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const PROPERTY_TYPES = useMemo(() => getPropertyTypes(t), [t]);
  const FEATURES_LIST = useMemo(() => getFeaturesList(t), [t]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    priceRange: [0, 1000000],
    propertyType: [],
    status: [],
    bedrooms: '',
    bathrooms: '',
    areaRange: [0, 500],
    location: '',
    features: [],
    energyRating: [],
    yearBuiltRange: [1900, 2024],
    furnished: '',
    sortBy: 'date-desc'
  });

  // Load properties from the same source as Home page
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await fetch('/propertiesMurcia.json');
        const data = await response.json();
        setProperties(data);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Apply filters
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    if (filters.propertyType.length > 0) {
      filtered = filtered.filter(p => filters.propertyType.includes(p.type));
    }

    if (filters.status.length > 0) {
      filtered = filtered.filter(p => filters.status.includes(p.status));
    }

    if (filters.bedrooms) {
      const bedrooms = parseInt(filters.bedrooms);
      filtered = filtered.filter(p => p.bedrooms >= bedrooms);
    }

    if (filters.bathrooms) {
      const bathrooms = parseInt(filters.bathrooms);
      filtered = filtered.filter(p => p.bathrooms >= bathrooms);
    }

    // Price range filter
    filtered = filtered.filter(p =>
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Area range filter
    filtered = filtered.filter(p =>
      p.area >= filters.areaRange[0] && p.area <= filters.areaRange[1]
    );

    // Features filter
    if (filters.features.length > 0) {
      filtered = filtered.filter(p =>
        filters.features.some(feature => p.features.includes(feature))
      );
    }

    // Energy rating filter
    if (filters.energyRating.length > 0) {
      filtered = filtered.filter(p => filters.energyRating.includes(p.energyRating));
    }

    // Furnished filter
    if (filters.furnished) {
      const isFurnished = filters.furnished === 'true';
      filtered = filtered.filter(p => p.furnished === isFurnished);
    }

    // Sort
    switch (filters.sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'area-asc':
        filtered.sort((a, b) => a.area - b.area);
        break;
      case 'area-desc':
        filtered.sort((a, b) => b.area - a.area);
        break;
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
        break;
      case 'rating-desc':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    return filtered;
  }, [properties, filters]);

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      priceRange: [0, 1000000],
      propertyType: [],
      status: [],
      bedrooms: '',
      bathrooms: '',
      areaRange: [0, 500],
      location: '',
      features: [],
      energyRating: [],
      yearBuiltRange: [1900, 2024],
      furnished: '',
      sortBy: 'date-desc'
    });
  };

  const handleSaveSearch = async () => {
    if (!user) return;
    const name = prompt(t('view.save_search_prompt'));
    if (!name) return;

    try {
      await appService.saveSearch({
        name,
        filters
      });
      alert(t('view.save_search_success'));
    } catch (error) {
      console.error("Error saving search", error);
      alert(t('view.save_search_error'));
    }
  };

  const formatPrice = (price: number, status: string) => {
    const formatter = new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formattedPrice = formatter.format(price);
    return status === 'alquiler' ? `${formattedPrice}/${t('common.month')}` : formattedPrice;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading_properties')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">
                <motion.h1
                  className="text-4xl md:text-6xl font-bold mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {t('properties.hero_title')}
                </motion.h1>
                <motion.p
                  className="text-xl md:text-2xl text-blue-100 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {t('properties.hero_subtitle')}
                </motion.p>

                {/* Quick Search */}
                <motion.div
                  className="max-w-2xl mx-auto bg-white rounded-2xl p-6 shadow-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder={t('properties.search_placeholder')}
                          value={filters.searchTerm}
                          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      <FunnelIcon className="h-5 w-5 mr-2" />
                      {t('filters.title')}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('properties.filters_advanced')}
                    </h3>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={clearFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {t('filters.clear')}
                      </button>
                      {user && (
                        <button
                          onClick={handleSaveSearch}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          {t('view.save_search')}
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilters(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Property Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('filter.propertyType')}
                      </label>
                      <div className="space-y-2">
                        {PROPERTY_TYPES.map(type => (
                          <label key={type.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.propertyType.includes(type.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters(prev => ({
                                    ...prev,
                                    propertyType: [...prev.propertyType, type.value]
                                  }));
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    propertyType: prev.propertyType.filter(t => t !== type.value)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {type.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('filter.status')}
                      </label>
                      <div className="space-y-2">
                        {['venta', 'alquiler'].map(status => (
                          <label key={status} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.status.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters(prev => ({
                                    ...prev,
                                    status: [...prev.status, status]
                                  }));
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    status: prev.status.filter(s => s !== status)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                              {status === 'venta' ? t('status.for-sale') : t('status.for-rent')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Bedrooms & Bathrooms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('filters.minBedrooms')}
                      </label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">{t('common.any')}</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                      </select>

                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                        {t('filters.minBathrooms')}
                      </label>
                      <select
                        value={filters.bathrooms}
                        onChange={(e) => setFilters(prev => ({ ...prev, bathrooms: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">{t('common.any')}</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('filters.priceRange')} (€)
                      </label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="1000000"
                          step="10000"
                          value={filters.priceRange[1]}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            priceRange: [prev.priceRange[0], parseInt(e.target.value)]
                          }))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>€0</span>
                          <span>€{filters.priceRange[1].toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Features */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('propertyDetail.features')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {FEATURES_LIST.slice(0, 8).map(feature => (
                        <button
                          key={feature}
                          onClick={() => {
                            if (filters.features.includes(feature)) {
                              setFilters(prev => ({
                                ...prev,
                                features: prev.features.filter(f => f !== feature)
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                features: [...prev.features, feature]
                              }));
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${filters.features.includes(feature)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                            }`}
                        >
                          {feature}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('properties.found', { count: filteredProperties.length })}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('properties.ideal')}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort */}
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="date-desc">{t('properties.sort_recent')}</option>
                  <option value="price-asc">{t('properties.sort_price_asc')}</option>
                  <option value="price-desc">{t('properties.sort_price_desc')}</option>
                  <option value="area-asc">{t('properties.sort_area_asc')}</option>
                  <option value="area-desc">{t('properties.sort_area_desc')}</option>
                  <option value="rating-desc">{t('properties.sort_rating')}</option>
                </select>

                {/* View Mode */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    <div className="grid grid-cols-2 gap-1 h-4 w-4">
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    <MapIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {viewMode === 'grid' && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                layout
              >
                <AnimatePresence>
                  {filteredProperties.map((property) => (
                    <motion.div
                      key={property.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
                    >
                      {/* Property Image */}
                      <div className="relative h-64">
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />

                        {/* Status Badge */}
                        <div className="absolute top-4 left-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${property.status === 'venta'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                            }`}>
                            {property.status === 'venta' ? 'En Venta' : 'En Alquiler'}
                          </span>
                        </div>

                        {/* Featured Badge */}
                        {property.isFeatured && (
                          <div className="absolute top-4 right-4">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                              <StarIcon className="h-3 w-3 mr-1" />
                              Destacado
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="absolute bottom-4 right-4 flex space-x-2">
                          <button
                            onClick={() => toggleFavorite(property.id)}
                            className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                          >
                            {favorites.includes(property.id) ? (
                              <HeartIconSolid className="h-5 w-5 text-red-500" />
                            ) : (
                              <HeartIcon className="h-5 w-5 text-gray-600" />
                            )}
                          </button>
                          <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                            <ShareIcon className="h-5 w-5 text-gray-600" />
                          </button>
                        </div>

                        {/* Views Counter */}
                        <div className="absolute bottom-4 left-4 flex items-center bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                          <EyeIcon className="h-3 w-3 mr-1" />
                          {property.views}
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {property.title}
                          </h3>
                          <div className="flex items-center ml-2">
                            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                              {property.rating}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-3">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.location}</span>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPrice(property.price, property.status)}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${property.energyRating === 'A' ? 'bg-green-100 text-green-800' :
                            property.energyRating === 'B' ? 'bg-lime-100 text-lime-800' :
                              property.energyRating === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                            }`}>
                            Energía {property.energyRating}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center">
                            <RectangleStackIcon className="h-4 w-4 mr-1" />
                            <span>{property.bedrooms} hab.</span>
                          </div>
                          <div className="flex items-center">
                            <BeakerIcon className="h-4 w-4 mr-1" />
                            <span>{property.bathrooms} baños</span>
                          </div>
                          <div className="flex items-center">
                            <HomeIcon className="h-4 w-4 mr-1" />
                            <span>{property.area} m²</span>
                          </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {property.description}
                        </p>

                        {/* Features */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {property.features.slice(0, 3).map((feature, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                            >
                              {feature}
                            </span>
                          ))}
                          {property.features.length > 3 && (
                            <span className="text-blue-600 text-xs">
                              +{property.features.length - 3} más
                            </span>
                          )}
                        </div>

                        {/* Agent Info */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center">
                            <img
                              src={property.agent.avatar}
                              alt={property.agent.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {property.agent.name}
                              </div>
                            </div>
                          </div>
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-6">
                <AnimatePresence>
                  {filteredProperties.map((property) => (
                    <motion.div
                      key={property.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Property Image */}
                        <div className="relative md:w-1/3 h-64 md:h-auto">
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />

                          {/* Status Badge */}
                          <div className="absolute top-4 left-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${property.status === 'venta'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                              }`}>
                              {property.status === 'venta' ? 'En Venta' : 'En Alquiler'}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="absolute bottom-4 right-4 flex space-x-2">
                            <button
                              onClick={() => toggleFavorite(property.id)}
                              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                            >
                              {favorites.includes(property.id) ? (
                                <HeartIconSolid className="h-5 w-5 text-red-500" />
                              ) : (
                                <HeartIcon className="h-5 w-5 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {property.title}
                              </h3>
                              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                <span>{property.location}</span>
                              </div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-3xl font-bold text-blue-600">
                                  {formatPrice(property.price, property.status)}
                                </div>
                                <div className="flex items-center">
                                  <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                                  <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                                    {property.rating}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <RectangleStackIcon className="h-5 w-5 mr-2" />
                              <span>{property.bedrooms} dormitorios</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <BeakerIcon className="h-5 w-5 mr-2" />
                              <span>{property.bathrooms} baños</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <HomeIcon className="h-5 w-5 mr-2" />
                              <span>{property.area} m²</span>
                            </div>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {property.description}
                          </p>

                          {/* Features */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {property.features.slice(0, 5).map((feature, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                              >
                                {feature}
                              </span>
                            ))}
                            {property.features.length > 5 && (
                              <span className="text-blue-600 text-sm">
                                +{property.features.length - 5} más
                              </span>
                            )}
                          </div>

                          {/* Agent Info and Actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center">
                              <img
                                src={property.agent.avatar}
                                alt={property.agent.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {property.agent.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {property.agent.phone}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                                Contactar
                              </button>
                              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                Ver detalles
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {viewMode === 'map' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Vista de mapa en desarrollo
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Aquí se mostrará el mapa interactivo con las propiedades
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredProperties.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No se encontraron propiedades
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Intenta ajustar tus filtros de búsqueda
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Limpiar filtros
                </button>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Properties;