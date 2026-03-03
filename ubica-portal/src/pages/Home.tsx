import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  MapIcon,
  ViewColumnsIcon,
  Bars3Icon,
  PlusIcon,
  MinusIcon,
  PencilIcon,
  TrashIcon,
  HandRaisedIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  BanknotesIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from '@heroicons/react/24/outline';
import { PropertyCard, PropertyCardSkeleton } from '../components/property/PropertyCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DrawControl } from '../components/map/DrawControl';
import { useLanguage } from '../hooks/useLanguage';
import appService from '../services';
import type { Property, PropertyFilters } from '../types';
import AIChatModal from '../components/ai/AIChatModal';
import { useAuth } from '../contexts/AuthContext';

// Custom marker icon for properties with price
const createPriceMarker = (price: number, isSelected: boolean = false) => {
  const formattedPrice = new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(price);

  return L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div class="price-marker ${isSelected ? 'selected' : ''}">
        <div class="price-badge">
          ${formattedPrice}€
        </div>
      </div>
    `,
    iconSize: [80, 40],
    iconAnchor: [40, 40],
  });
};

// Ray-casting algorithm for precise Point in Polygon intersection
const isPointInPolygon = (point: L.LatLng, vs: L.LatLng[]) => {
  let x = point.lat, y = point.lng;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].lat, yi = vs[i].lng;
    let xj = vs[j].lat, yj = vs[j].lng;
    let intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Map controller component with fullscreen support
function MapController({ zoom, isFullscreen }: { zoom: number; isFullscreen: boolean }) {
  const map = useMap();

  useEffect(() => {
    map.setZoom(zoom);
  }, [zoom, map]);

  // Invalidate size when entering/exiting fullscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);

  return null;
}

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [toolbarScale, setToolbarScale] = useState(0.7);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapZoom, setMapZoom] = useState(9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawnArea, setDrawnArea] = useState<any>(null);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);
  const [showMapToast, setShowMapToast] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    if (user?.role === 'user') {
      appService.getFavorites().then(favs => setFavorites(favs.map(f => f.id))).catch(console.error);
    }
  }, [user]);

  const handleToggleFavorite = async (propertyId: number) => {
    if (!user) return;
    const isFav = favorites.includes(propertyId);
    try {
      if (isFav) {
        await appService.removeFavorite(propertyId);
        setFavorites(prev => prev.filter(id => id !== propertyId));
      } else {
        await appService.addFavorite(propertyId);
        setFavorites(prev => [...prev, propertyId]);
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const [filters, setFilters] = useState<PropertyFilters>({
    type: '',
    location: '',
    minPrice: 0,
    maxPrice: 1000000,
    bedrooms: 0,
    status: '',
    searchTerm: ''
  });

  const isSearchActive = !!searchTerm ||
    Object.values(filters).some(f => f !== '' && f !== 0 && f !== 1000000);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  // Initialize filters from URL search params
  useEffect(() => {
    const newFilters: Partial<PropertyFilters> = {};
    let hasParams = false;

    searchParams.forEach((value, key) => {
      if (key in filters) {
        hasParams = true;
        if (key === 'minPrice' || key === 'maxPrice' || key === 'bedrooms') {
          (newFilters as any)[key] = parseInt(value) || 0;
        } else {
          (newFilters as any)[key] = value;
        }
      } else if (key === 'searchTerm') {
        setSearchTerm(value);
        hasParams = true;
      }
    });

    if (hasParams) {
      setFilters(prev => ({ ...prev, ...newFilters }));
      setShowFilters(true); // Open filters if params were passed
    }
  }, []); // Run once on mount

  // Center map on Murcia
  const murciaCenter: [number, number] = [37.9922, -1.1307];

  // Algoritmo de Ray Casting para polígonos simples en un array
  const isPointInPolygon = (lat: number, lng: number, polygon: { lat: number, lng: number }[]) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat,
        yi = polygon[i].lng;
      const xj = polygon[j].lat,
        yj = polygon[j].lng;

      const intersect =
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  // Load properties data
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const data = await appService.getProperties(0, 100);
        // Filtrar propiedades "En uso" del listado público
        const publicData = data.filter(p => p.status !== 'in-use');
        setProperties(publicData);
        setFilteredProperties(publicData);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = properties;

    if (filters.type) {
      filtered = filtered.filter(p => p.type.toLowerCase().includes(filters.type.toLowerCase()));
    }

    if (filters.location) {
      filtered = filtered.filter(p => p.location.toLowerCase().includes(filters.location.toLowerCase()));
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.bedrooms > 0) {
      filtered = filtered.filter(p => p.bedrooms >= filters.bedrooms);
    }

    if (filters.minPrice > 0) {
      filtered = filtered.filter(p => p.price >= filters.minPrice);
    }

    if (filters.maxPrice < 1000000) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (hasDrawnArea && drawnArea && Array.isArray(drawnArea)) {
      filtered = filtered.filter(p => {
        return isPointInPolygon(p.coordinates.lat, p.coordinates.lng, drawnArea);
      });
    }

    setFilteredProperties(filtered);
  }, [filters, properties, searchTerm, hasDrawnArea, drawnArea]);

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSearch = async () => {
    if (!user) return;

    // Check if any filter is applied
    const isFilterApplied = Object.entries(filters).some(([key, value]) => {
      if (key === 'minPrice') return value !== 0;
      if (key === 'maxPrice') return value !== 1000000;
      if (key === 'bedrooms') return value !== 0;
      return value !== '';
    });

    if (!isFilterApplied && !searchTerm) {
      alert(t('view.save_search_empty'));
      return;
    }

    const name = prompt(t('view.save_search_prompt'));
    if (!name) return;

    try {
      await appService.saveSearch({
        name,
        filters: { ...filters, searchTerm }
      });
      alert(t('view.save_search_success'));
    } catch (error) {
      console.error("Error saving search", error);
      alert(t('view.save_search_error'));
    }
  };

  const handleViewDetails = (propertyId: number) => {
    navigate(`/property/${propertyId}`);
  };

  const handleMarkerClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      location: '',
      minPrice: 0,
      maxPrice: 1000000,
      bedrooms: 0,
      status: '',
      searchTerm: ''
    });
    setSearchTerm('');
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 1));
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;

    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle drawn area
  const handleDrawCreated = (data: { type: string, coordinates: { lat: number, lng: number }[] }) => {
    console.log('DRAW CREATED EVENT RECIBIDO!', data);

    setDrawnArea(data.coordinates);
    setHasDrawnArea(true);
    // Note: Do not disable drawing mode here so the floating navbar stays open!
  };

  const toggleDrawingMode = () => {
    setIsDrawingEnabled(!isDrawingEnabled);
    if (!isDrawingEnabled && mapContainerRef.current) {
      setShowMapToast(true);
      setTimeout(() => setShowMapToast(false), 3000);
    }
  };

  // Efecto para asegurar que el mapa se centra y gana visibilidad al empezar a dibujar
  useEffect(() => {
    if (isDrawingEnabled && mapContainerRef.current) {
      // Pequeño retardo para asegurar que la UI se ha actualizado (especialmente en móvil)
      const timer = setTimeout(() => {
        const controlsBar = document.getElementById('map-controls-bar');
        if (controlsBar) {
          const rect = controlsBar.getBoundingClientRect();
          // The navbar is top-0 and height is approx 80px (sticky top-20 for controls bar).
          // We scroll the window so controlsBar is exactly at 80px from top viewport.
          const targetY = window.pageYOffset + rect.top - 80;
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDrawingEnabled]);

  const clearDrawnArea = () => {
    setHasDrawnArea(false);
    setDrawnArea(null);
    setIsDrawingEnabled(false);
  };

  // Custom tool handlers for the floating drawing menu
  const handleFinishDrawing = () => {
    const btn = document.querySelector('.leaflet-draw-actions a[title="Finalizar dibujo"]') as HTMLElement || document.querySelector('.leaflet-draw-actions a[title="Finish drawing"]') as HTMLElement;
    if (btn) btn.click();
    // Toolbar stays open to allow clear, zoom, filters, or fullscreen!
  };

  const handleCancelDrawing = () => {
    const btn = document.querySelector('.leaflet-draw-actions a[title="Cancelar dibujo"]') as HTMLElement || document.querySelector('.leaflet-draw-actions a[title="Cancel drawing"]') as HTMLElement;
    if (btn) btn.click();
    setIsDrawingEnabled(false);
  };

  const handleRestartDrawing = () => {
    setHasDrawnArea(false);
    setDrawnArea(null);
    const cancelBtn = document.querySelector('.leaflet-draw-actions a[title="Cancelar dibujo"]') as HTMLElement || document.querySelector('.leaflet-draw-actions a[title="Cancel drawing"]') as HTMLElement;
    if (cancelBtn) cancelBtn.click();

    // Slight delay to allow Leaflet to clear before retriggering
    setTimeout(() => {
      const polygonBtn = document.querySelector('.leaflet-draw-draw-polygon') as HTMLElement;
      if (polygonBtn) polygonBtn.click();
    }, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section - Modern Search Box with Adaptive Background */}
      {/* Hero Search Section - Ocultar si hay búsqueda activa o si se está dibujando */}
      {!isSearchActive && !isDrawingEnabled && (
        <div className="bg-white dark:bg-gray-900 py-8 md:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Gradient Box Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 rounded-3xl p-6 md:p-8 shadow-xl"
            >
              {/* Eslogan Section - Dark Semi-transparent Box */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-black/40 backdrop-blur-sm py-4 px-6 md:px-8 rounded-2xl mb-6 text-center"
              >
                <p className="text-lg md:text-xl font-semibold text-white tracking-wide">
                  {t('header.slogan')}
                </p>
              </motion.div>

              {/* Search Bar - White Modern Box with AI Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('header.mainSearchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 text-gray-900 bg-white border-0 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-base rounded-xl"
                    />
                  </div>
                </div>

                {/* Modo IA Button — Google-style with animated gradient */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAIChat(true)}
                  className="relative group flex-shrink-0"
                >
                  {/* Animated gradient border */}
                  <div className="absolute -inset-[2px] rounded-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'conic-gradient(from var(--ai-angle, 0deg), #10b981, #06b6d4, #8b5cf6, #ec4899, #f59e0b, #10b981)',
                      animation: 'aiGradientSpin 3s linear infinite',
                    }}
                  />
                  <div className="relative bg-white dark:bg-gray-800 rounded-xl px-5 py-3.5 flex items-center gap-2.5 shadow-sm">
                    {/* Sparkle/Stars Icon */}
                    <svg className="h-5 w-5 text-transparent" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.3))' }}>
                      <defs>
                        <linearGradient id="aiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                        fill="url(#aiSparkleGrad)" stroke="url(#aiSparkleGrad)" strokeWidth="0.5" />
                    </svg>
                    <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent whitespace-nowrap hidden sm:inline">
                      {t('view.ia_mode')}
                    </span>
                  </div>
                </motion.button>

                {/* Keyframes for the rotating gradient */}
                <style>{`
                  @property --ai-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                  }
                  @keyframes aiGradientSpin {
                    to { --ai-angle: 360deg; }
                  }
                `}</style>
              </motion.div>
            </motion.div>
          </div>
        </div>
      )}



      {/* Map Controls Bar */}
      <div id="map-controls-bar" className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 py-3 relative">



          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center md:justify-start w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{t('common.filters')}</span>
              </motion.button>

              {/* Drawing Tools - Only show in map mode */}
              {viewMode === 'map' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleDrawingMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow border transition-all ${isDrawingEnabled
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:shadow-md'
                      }`}
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">{t('map.drawArea')}</span>
                  </motion.button>

                  {hasDrawnArea && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearDrawnArea}
                      className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow border border-red-600 hover:bg-red-600 transition-all"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('map.clearArea')}</span>
                    </motion.button>
                  )}
                </>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {hasDrawnArea
                  ? t('view.propertiesInArea', { count: filteredProperties.length })
                  : t('view.properties', { count: filteredProperties.length })}
              </div>
            </div>

            {/* Right Controls - View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto justify-center">
              {/* Grid Toggle */}
              <button
                onClick={() => { setViewMode('grid'); setViewLayout('grid'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-all ${viewMode === 'grid' && viewLayout === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                title="Vista Cuadrícula"
              >
                <ViewColumnsIcon className="h-4 w-4" />
                <span className="text-xs font-semibold sm:hidden">{t('view.grid', 'Grid')}</span>
              </button>

              {/* List Toggle */}
              <button
                onClick={() => { setViewMode('grid'); setViewLayout('list'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-all ${viewMode === 'grid' && viewLayout === 'list'
                  ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                title="Vista Lista"
              >
                <Bars3Icon className="h-4 w-4" />
                <span className="text-xs font-semibold sm:hidden">{t('view.list')}</span>
              </button>

              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

              {/* Map Toggle */}
              <button
                onClick={() => setViewMode('map')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-3 py-1.5 rounded-md transition-all ${viewMode === 'map'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50'
                  }`}
              >
                <MapIcon className="h-4 w-4" />
                <span className="text-sm font-semibold">{t('view.map')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-750 border-b border-emerald-100 dark:border-gray-700 shadow-lg sticky top-0 z-30"
        >
          <div className="container mx-auto px-4 py-6">
            {/* Row 1: Main filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('filters.propertyType')}
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="">{t('filters.allTypes')}</option>
                  <option value="apartment">{t('property.apartment')}</option>
                  <option value="piso">{t('property.flat')}</option>
                  <option value="house">{t('property.house')}</option>
                  <option value="villa">{t('property.villa')}</option>
                  <option value="penthouse">{t('property.penthouse')}</option>
                  <option value="chalet">{t('property.chalet')}</option>
                  <option value="estudio">{t('property.studio')}</option>
                  <option value="duplex">{t('property.duplex')}</option>
                  <option value="terreno">{t('property.land')}</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('filters.location')}
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="">{t('filters.allLocations')}</option>
                  <option value="murcia">{t('location.murcia')}</option>
                  <option value="cartagena">{t('location.cartagena')}</option>
                  <option value="lorca">{t('location.lorca')}</option>
                  <option value="molina">{t('location.molina')}</option>
                  <option value="torre">{t('location.torre')}</option>
                  <option value="aguilas">{t('location.aguilas')}</option>
                  <option value="cieza">{t('location.cieza')}</option>
                  <option value="yecla">{t('location.yecla')}</option>
                  <option value="jumilla">{t('location.jumilla')}</option>
                  <option value="san javier">{t('location.sanjavier')}</option>
                  <option value="mazarron">{t('location.mazarron')}</option>
                  <option value="mar menor">{t('location.marmenor')}</option>
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('filters.bedrooms')}
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange('bedrooms', parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="0">{t('filters.anyAmount')}</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('properties.status_field')}
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="">{t('filters.allStatuses')}</option>
                  <option value="for-sale">{t('status.for-sale')}</option>
                  <option value="for-rent">{t('status.for-rent')}</option>
                  <option value="reserved">{t('filters.reserved')}</option>
                </select>
              </div>
            </div>

            {/* Row 2: Price range + Clear */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-3 border-t border-emerald-100 dark:border-gray-700">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                    {t('filters.minPrice')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                      className="w-36 pl-7 pr-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all hover:border-emerald-300"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                    {t('filters.maxPrice')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 1000000)}
                      className="w-36 pl-7 pr-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all hover:border-emerald-300"
                      placeholder="1.000.000"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={resetFilters}
                  className="px-5 py-2.5 bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-emerald-50 dark:hover:bg-gray-600 transition-all shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('common.clearFilters')}
                </motion.button>
                {user && (
                  <motion.button
                    onClick={handleSaveSearch}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('view.save_search')}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div className="relative">
        {viewMode === 'map' ? (
          /* Map View */
          <div
            ref={mapContainerRef}
            className="map-fullscreen-container"
          >
            <div className={`container mx-auto px-4 relative transition-all duration-500 ease-in-out ${isDrawingEnabled ? 'mt-4 mb-8 md:mt-6 md:mb-12' : 'my-8 md:my-16'}`}>

              {/* Toast Notificación centrada en la pantalla */}
              <AnimatePresence>
                {showMapToast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-white/15 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl shadow-[0_8px_32px_rgba(16,185,129,0.35)] flex items-center gap-3"
                      style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.85) 0%, rgba(20,184,166,0.85) 100%)' }}
                    >
                      <div className="bg-white/20 p-2 rounded-lg">
                        <PencilIcon className="h-5 w-5" />
                      </div>
                      <span className="text-base font-semibold tracking-wide">Modo de dibujo activado</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="map-wrapper" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                <style>
                  {`
                  .map-fullscreen-container:fullscreen {
                    width: 100vw !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #f9fafb;
                  }
                  .map-fullscreen-container:fullscreen .container {
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .map-fullscreen-container:fullscreen .map-wrapper {
                    width: 100vw !important;
                    height: 100vh !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                  }
                  .map-wrapper {
                    position: relative;
                    width: 100%;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                  }
                  .price-marker {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .price-badge {
                    background: linear-gradient(135deg, #059669 0%, #14b8a6 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
                    white-space: nowrap;
                    border: 2px solid white;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  }
                  .price-badge:hover {
                    transform: scale(1.15) translateY(-2px);
                    box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4);
                  }
                  .price-marker.selected .price-badge {
                    background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%);
                    transform: scale(1.2);
                    box-shadow: 0 8px 20px rgba(13, 148, 136, 0.5);
                  }
                  .leaflet-container {
                    height: 100%;
                    width: 100%;
                    z-index: 1;
                  }
                  .leaflet-draw-actions {
                    display: none !important;
                  }
                  .leaflet-draw-toolbar {
                    display: none !important;
                  }
                `}
                </style>





                {/* Panel Flotante Minimalista de Dibujo MOVIDO AFUERA del mapa pero anclado al relative map-wrapper */}
                <AnimatePresence>
                  {isDrawingEnabled && (
                    <div className="absolute bottom-6 left-0 right-0 z-[2000] flex justify-center pointer-events-none">
                      <motion.div
                        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl px-2 py-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 dark:border-gray-700 flex items-center gap-1 sm:gap-2 transition-all pointer-events-auto cursor-default origin-bottom"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: toolbarScale }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        drag
                        dragMomentum={false}
                        dragElastic={0.1}
                        style={{ x: 0, y: 0 }}
                      >
                        {/* Drag Handle */}
                        <div className="flex flex-col items-center justify-center px-1 sm:px-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-emerald-500 transition-colors">
                          <HandRaisedIcon className="h-5 w-5" />
                          <div className="w-1.5 h-1.5 rounded-full bg-current mt-1"></div>
                        </div>

                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        {/* Scale Controls */}
                        <div className="flex flex-col gap-1 px-1">
                          <button
                            onClick={() => setToolbarScale(prev => Math.min(prev + 0.1, 1.5))}
                            className="p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 transition-colors"
                            title="Aumentar tamaño barra"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setToolbarScale(prev => Math.max(prev - 0.1, 0.6))}
                            className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 transition-colors"
                            title="Reducir tamaño barra"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <button onClick={handleFinishDrawing} className="flex flex-col items-center gap-0.5 min-w-[50px] sm:min-w-[60px] p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors group">
                          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><CheckIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] sm:text-[11px] font-bold">Hecho</span>
                        </button>

                        <button onClick={handleRestartDrawing} className="flex flex-col items-center gap-0.5 min-w-[50px] sm:min-w-[60px] p-1.5 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors group">
                          <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><ArrowPathIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] sm:text-[11px] font-bold">Reiniciar</span>
                        </button>

                        <button
                          onClick={() => {
                            setHasDrawnArea(false);
                            setDrawnArea(null);
                            setIsDrawingEnabled(false);
                            setTimeout(() => setIsDrawingEnabled(true), 10);
                          }}
                          className="flex flex-col items-center gap-0.5 min-w-[50px] sm:min-w-[60px] p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors group"
                        >
                          <div className="bg-rose-100 dark:bg-rose-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><TrashIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] sm:text-[11px] font-bold">Borrar</span>
                        </button>

                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <button onClick={handleZoomIn} className="flex flex-col items-center gap-0.5 min-w-[44px] p-1.5 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group">
                          <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><MagnifyingGlassPlusIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] font-bold">Zoom+</span>
                        </button>

                        <button onClick={handleZoomOut} className="flex flex-col items-center gap-0.5 min-w-[44px] p-1.5 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group">
                          <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><MagnifyingGlassMinusIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] font-bold">Zoom-</span>
                        </button>

                        <button onClick={toggleFullscreen} className="flex flex-col items-center gap-0.5 min-w-[50px] sm:min-w-[60px] p-1.5 rounded-xl text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors group">
                          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                            {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-bold">Pantalla</span>
                        </button>

                        <button onClick={() => setShowFilters(true)} className="flex flex-col items-center gap-0.5 min-w-[50px] sm:min-w-[60px] p-1.5 rounded-xl text-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 transition-colors group">
                          <div className="bg-fuchsia-100 dark:bg-fuchsia-900/50 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><AdjustmentsHorizontalIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] sm:text-[11px] font-bold">Filtros</span>
                        </button>

                        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <button onClick={handleCancelDrawing} className="flex flex-col items-center gap-0.5 min-w-[44px] p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                          <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg group-hover:scale-110 transition-transform border border-gray-200 dark:border-gray-600"><XMarkIcon className="h-5 w-5" /></div>
                          <span className="text-[10px] font-bold">Salir</span>
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                <MapContainer
                  center={murciaCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController zoom={mapZoom} isFullscreen={isFullscreen} />

                  {/* Drawing controls */}
                  <DrawControl
                    onCreated={handleDrawCreated}
                    isEnabled={isDrawingEnabled}
                  />

                  {/* Render the extracted polygon area visually */}
                  {hasDrawnArea && drawnArea && Array.isArray(drawnArea) && (
                    <Polygon
                      positions={drawnArea}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }}
                    />
                  )}

                  {filteredProperties.map((property) => (
                    <Marker
                      key={property.id}
                      position={[property.coordinates.lat, property.coordinates.lng]}
                      icon={createPriceMarker(property.price, selectedProperty?.id === property.id)}
                      eventHandlers={{
                        click: () => handleMarkerClick(property),
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <img
                            src={property.images?.[0] || '/images/casa-moderna.jpg'}
                            alt={property.title}
                            className="w-full h-32 object-cover rounded-lg mb-2"
                          />
                          <h3 className="font-bold text-gray-900 mb-1">{property.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{property.location}</p>
                          <p className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-2">
                            {new Intl.NumberFormat('es-ES', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 0,
                            }).format(property.price)}
                          </p>
                          <div className="text-sm text-gray-600 mb-3">
                            {property.bedrooms} hab · {property.bathrooms} baños · {property.area}m²
                          </div>
                          <button
                            onClick={() => handleViewDetails(property.id)}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-medium shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            Ver Detalles
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        ) : (
          /* Grid/List View */
          <div className="container mx-auto px-4 py-6 md:py-8">
            <div className={
              viewLayout === 'list'
                ? "flex flex-col gap-6"
                : "grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
            }>
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={viewLayout === 'grid' ? 'col-span-1' : ''}
                >
                  <PropertyCard
                    property={property}
                    onViewDetails={handleViewDetails}
                    isFavorite={favorites.includes(property.id)}
                    onToggleFavorite={user?.role === 'user' ? handleToggleFavorite : undefined}
                    variant={viewLayout}
                  />
                </motion.div>
              ))}
            </div>

            {/* No Results */}
            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <MapIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No se encontraron propiedades
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Intenta ajustar los filtros para encontrar más resultados
                </p>
              </div>
            )}
          </div>
        )
        }
      </div >

      {/* AI Chat Modal */}
      <AIChatModal
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        searchContext={searchTerm}
      />
    </div >
  );
}
