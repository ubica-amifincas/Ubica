import { useState, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polygon, ZoomControl } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  MapIcon,
  ViewColumnsIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  BanknotesIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { Slider } from '../components/ui/slider';
import { PropertyCard, PropertyCardSkeleton } from '../components/property/PropertyCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DrawControl, type DrawControlHandle } from '../components/map/DrawControl';
import { useLanguage } from '../hooks/useLanguage';
import appService from '../services';
import type { Property, PropertyFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PROPERTY_TYPES, normalizeType } from '../utils/propertyStatus';
import { useAIChat } from '../contexts/AIChatContext';

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
          ${formattedPrice}&nbsp;€
        </div>
      </div>
    `,
    iconSize: [80, 40],
    iconAnchor: [40, 40],
  });
};

/** Inmuebles con coordenadas reales (sin ellas, el frontend pone el centro de Murcia y saldrían en un sitio falso). */
const hasRealCoordinates = (p: Property) => {
  const raw = p as Property & { latitude?: number | null; longitude?: number | null };
  return raw.latitude != null && raw.longitude != null;
};

/** Minúsculas y sin tildes: "Águilas" y "aguilas" son la misma ubicación. */
const plain = (s: string | null | undefined) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type LatLng = { lat: number; lng: number };
/** Rectángulo del mapa: [[sur, oeste], [norte, este]] */
type Bounds = [[number, number], [number, number]];

const MAX_PRICE = 1000000;
const DEFAULT_FILTERS: PropertyFilters = { type: '', location: '', minPrice: 0, maxPrice: MAX_PRICE, bedrooms: 0, status: '', searchTerm: '' };

const BASE_LOCATIONS = [
  ['murcia', 'location.murcia'], ['cartagena', 'location.cartagena'], ['lorca', 'location.lorca'], ['molina', 'location.molina'],
  ['torre', 'location.torre'], ['aguilas', 'location.aguilas'], ['cieza', 'location.cieza'], ['yecla', 'location.yecla'],
  ['jumilla', 'location.jumilla'], ['san javier', 'location.sanjavier'], ['mazarron', 'location.mazarron'], ['mar menor', 'location.marmenor'],
] as const;

// La búsqueda vive en la URL para poder compartirla, guardarla en marcadores o recargar sin perderla.
// La zona dibujada va como "lat,lng;lat,lng;..." y el rectángulo del mapa como "sur,oeste,norte,este" (5 decimales ≈ 1 m).
const SEARCH_KEYS = ['type', 'location', 'status', 'bedrooms', 'minPrice', 'maxPrice', 'q', 'searchTerm', 'view', 'area', 'bbox'];
const encodeArea = (area: LatLng[]) => area.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
const decodeArea = (value: string | null): LatLng[] | null => {
  const points = (value || '').split(';').map(pair => pair.split(',').map(Number))
    .filter(n => n.length === 2 && n.every(Number.isFinite)).map(([lat, lng]) => ({ lat, lng }));
  return points.length >= 3 ? points : null;
};
const encodeBounds = (b: Bounds) => [b[0][0], b[0][1], b[1][0], b[1][1]].map(n => n.toFixed(5)).join(',');
const decodeBounds = (value: string | null): Bounds | null => {
  const n = (value || '').split(',').map(Number);
  return n.length === 4 && n.every(Number.isFinite) ? [[n[0], n[1]], [n[2], n[3]]] : null;
};
const inBounds = (p: LatLng, b: Bounds) => p.lat >= b[0][0] && p.lat <= b[1][0] && p.lng >= b[0][1] && p.lng <= b[1][1];

function readSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const num = (key: string, fallback: number) => {
    const value = parseInt(params.get(key) ?? '', 10);
    return Number.isFinite(value) ? value : fallback;
  };
  const filters: PropertyFilters = {
    ...DEFAULT_FILTERS,
    type: params.get('type') ?? '',
    location: params.get('location') ?? '',
    status: params.get('status') ?? '',
    bedrooms: num('bedrooms', 0),
    minPrice: num('minPrice', 0),
    maxPrice: num('maxPrice', MAX_PRICE),
  };
  return {
    filters,
    // Las búsquedas guardadas antiguas usan "searchTerm"
    searchTerm: params.get('q') ?? params.get('searchTerm') ?? '',
    view: (params.get('view') === 'map' ? 'map' : 'grid') as 'grid' | 'map',
    area: decodeArea(params.get('area')),
    bounds: decodeBounds(params.get('bbox')),
  };
}

/**
 * Encuadra los resultados al abrir el mapa y al cambiar (o la zona buscada, si la hay); se reajusta si cambia su tamaño.
 * Al moverlo él mismo olvida cualquier toque previo, para que no cuente como movimiento del usuario.
 */
function MapController({ points, bounds, fitKey, sizeKey, userMoveRef }: {
  points: [number, number][]; bounds: Bounds | null; fitKey: string; sizeKey: string; userMoveRef: MutableRefObject<boolean>;
}) {
  const map = useMap();

  const autoMove = (move: () => void) => {
    userMoveRef.current = false;
    move();
  };

  useEffect(() => {
    if (bounds) autoMove(() => map.fitBounds(bounds));
    else if (points.length === 1) autoMove(() => map.setView(points[0], 14));
    else if (points.length > 1) autoMove(() => map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  useEffect(() => {
    const timer = setTimeout(() => autoMove(() => map.invalidateSize()), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeKey, map]);

  return null;
}

/**
 * Avisa cuando el usuario arrastra o hace zoom. Un movimiento cuenta como suyo si empieza con un toque, clic, rueda
 * o tecla sobre el mapa; los encuadres automáticos (que pueden lanzar varios "moveend") no muestran el botón.
 */
function MapMoveWatcher({ userMoveRef, onUserMove }: { userMoveRef: MutableRefObject<boolean>; onUserMove: (b: Bounds) => void }) {
  const map = useMapEvents({
    moveend(e) {
      if (!userMoveRef.current) return;
      userMoveRef.current = false;
      const b = e.target.getBounds();
      onUserMove([[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]);
    },
  });
  useEffect(() => {
    const container = map.getContainer();
    const mark = () => { userMoveRef.current = true; };
    const events = ['pointerdown', 'wheel', 'keydown'] as const;
    events.forEach(name => container.addEventListener(name, mark, { passive: true }));
    return () => events.forEach(name => container.removeEventListener(name, mark));
  }, [map, userMoveRef]);
  return null;
}

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [initialSearch] = useState(readSearchFromUrl);
  const [showFilters, setShowFilters] = useState(() =>
    Object.entries(initialSearch.filters).some(([key, value]) => value !== DEFAULT_FILTERS[key as keyof PropertyFilters]));
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialSearch.view);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>(() => window.innerWidth < 768 ? 'list' : 'grid');
  const [searchTerm, setSearchTerm] = useState(initialSearch.searchTerm);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawnArea, setDrawnArea] = useState<LatLng[] | null>(initialSearch.area);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [hasDrawnArea, setHasDrawnArea] = useState(!!initialSearch.area);
  // "Buscar en esta zona": rectángulo aplicado como filtro y el último encuadre que movió el usuario
  const [boundsFilter, setBoundsFilter] = useState<Bounds | null>(initialSearch.bounds);
  const [pendingBounds, setPendingBounds] = useState<Bounds | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const userMoveRef = useRef(false);
  const [showMapToast, setShowMapToast] = useState(false);
  const [drawPoints, setDrawPoints] = useState(0);
  const drawRef = useRef<DrawControlHandle>(null);
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;  const { t } = useLanguage();
  const { openChat } = useAIChat();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Barra compacta: aparece fija arriba cuando la búsqueda grande sale de la pantalla.
  // Va fuera del flujo y solo se mueve con transform, así no desplaza el contenido al hacer scroll.
  const [showCompactSearch, setShowCompactSearch] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);

  // Muestra la barra compacta cuando la búsqueda grande pasa por debajo de ella (64px).
  // Se mide en cada evento de scroll (una lectura barata; React ignora el estado si no cambia) en lugar de con
  // IntersectionObserver, que dentro de iframes y algunos navegadores móviles mide contra otra ventana.
  useEffect(() => {
    const update = () => {
      const el = heroSearchRef.current;
      setShowCompactSearch(!!el && el.getBoundingClientRect().bottom < 64);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isDrawingEnabled, viewMode, loading]);

  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [tutorialKeyMode, setTutorialKeyMode] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Focus effect for drawing tools
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

  const [filters, setFilters] = useState<PropertyFilters>(initialSearch.filters);

  const isSearchActive = !!searchTerm ||
    Object.values(filters).some(f => f !== '' && f !== 0 && f !== MAX_PRICE);
  const hasZone = hasDrawnArea || !!boundsFilter;

  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Refleja la búsqueda en la URL (sin crear una entrada de historial por cada cambio)
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      SEARCH_KEYS.forEach(key => next.delete(key));
      if (filters.type) next.set('type', filters.type);
      if (filters.location) next.set('location', filters.location);
      if (filters.status) next.set('status', filters.status);
      if (filters.bedrooms > 0) next.set('bedrooms', String(filters.bedrooms));
      if (filters.minPrice > 0) next.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice < MAX_PRICE) next.set('maxPrice', String(filters.maxPrice));
      if (searchTerm) next.set('q', searchTerm);
      if (viewMode === 'map') next.set('view', 'map');
      if (hasDrawnArea && drawnArea) next.set('area', encodeArea(drawnArea));
      if (boundsFilter) next.set('bbox', encodeBounds(boundsFilter));
      return next;
    }, { replace: true });
  }, [filters, searchTerm, viewMode, hasDrawnArea, drawnArea, boundsFilter, setSearchParams]);

  // Ubicaciones del desplegable: las de siempre más la que venga en la URL (p. ej. "Murcia" desde el asistente)
  const locationOptions = useMemo(() => {
    const options: { value: string; label: string }[] = BASE_LOCATIONS.map(([value, key]) => ({ value, label: t(key) }));
    if (filters.location && !options.some(o => plain(o.value) === plain(filters.location))) {
      options.push({ value: filters.location, label: filters.location });
    }
    return options;
  }, [filters.location, t]);
  const selectedLocation = locationOptions.find(o => plain(o.value) === plain(filters.location))?.value ?? '';

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
      // Las búsquedas guardadas pueden tener el tipo en su forma antigua ("piso", "estudio")
      filtered = filtered.filter(p => normalizeType(p.type) === normalizeType(filters.type));
    }

    if (filters.location) {
      const location = plain(filters.location);
      filtered = filtered.filter(p => plain(p.location).includes(location));
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
      const term = plain(searchTerm);
      filtered = filtered.filter(p => plain(p.title).includes(term) || plain(p.location).includes(term) || plain(p.description).includes(term));
    }

    // Un inmueble sin coordenadas no está "dentro" de ninguna zona
    if (hasDrawnArea && drawnArea) {
      filtered = filtered.filter(p => hasRealCoordinates(p) && isPointInPolygon(p.coordinates.lat, p.coordinates.lng, drawnArea));
    }
    if (boundsFilter) {
      filtered = filtered.filter(p => hasRealCoordinates(p) && inBounds(p.coordinates, boundsFilter));
    }

    setFilteredProperties(filtered);
  }, [filters, properties, searchTerm, hasDrawnArea, drawnArea, boundsFilter]);

  const mappableProperties = useMemo(() => filteredProperties.filter(hasRealCoordinates), [filteredProperties]);
  const unmappedCount = filteredProperties.length - mappableProperties.length;
  const showResultsList = viewMode === 'map' && !isFullscreen && filteredProperties.length > 0;
  const mapPoints = useMemo<[number, number][]>(
    () => mappableProperties.map(p => [p.coordinates.lat, p.coordinates.lng]),
    [mappableProperties],
  );
  // Se reencuadra al abrir el mapa y cuando cambian los resultados; con "Buscar en esta zona" se queda en la zona
  const mapFitKey = boundsFilter
    ? `${viewMode}|bbox:${encodeBounds(boundsFilter)}`
    : `${viewMode}|${mappableProperties.map(p => p.id).join(',')}`;

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
    // Lleva la ficha de la lista lateral a la vista
    document.getElementById(`map-result-${property.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm('');
  };

  const searchThisArea = () => {
    if (!pendingBounds) return;
    setBoundsFilter(pendingBounds);
    setPendingBounds(null);
  };

  const resetAll = () => {
    resetFilters();
    clearDrawnArea();
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
  // Al cerrar la zona se sale del modo dibujo: la zona queda en el mapa y filtra los resultados
  const handleDrawCreated = (data: { type: string, coordinates: LatLng[] }) => {
    setDrawnArea(data.coordinates);
    setHasDrawnArea(true);
    setIsDrawingEnabled(false);
    // La zona dibujada sustituye a la de "Buscar en esta zona"
    setBoundsFilter(null);
    setPendingBounds(null);
  };

  const toggleDrawingMode = () => {
    const next = !isDrawingEnabled;
    setIsDrawingEnabled(next);
    // La explicación se ve una vez por sesión
    if (next) {
      try {
        if (sessionStorage.getItem('ubica-draw-help') !== '1') {
          setShowMapToast(true);
          sessionStorage.setItem('ubica-draw-help', '1');
        }
      } catch {
        setShowMapToast(true);
      }
    }
  };

  useEffect(() => {
    if (!isDrawingEnabled) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsDrawingEnabled(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawingEnabled]);

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

  // Handle scroll for sticky hero
  useEffect(() => {
    const handleScroll = () => {
      // Usar 80px como punto de quiebre (altura de la navbar aprox)
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToControls = () => {
    const controlsBar = document.getElementById('map-controls-bar');
    if (controlsBar) {
      const rect = controlsBar.getBoundingClientRect();
      const targetY = window.pageYOffset + rect.top - 80;
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to map controls bar when switching to map view mode (Restored Centering)
  useEffect(() => {
    if (viewMode === 'map') {
      document.body.classList.add('map-mode-active');
      const timer = setTimeout(scrollToControls, 150);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('map-mode-active');
      };
    } else {
      document.body.classList.remove('map-mode-active');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('map-mode-active');
    };
  }, [viewMode]);

  // Quita cualquier zona: la dibujada y la de "Buscar en esta zona"
  const clearDrawnArea = () => {
    setHasDrawnArea(false);
    setDrawnArea(null);
    setIsDrawingEnabled(false);
    setBoundsFilter(null);
    setPendingBounds(null);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="page-container py-8">
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



  const renderSearchRow = (compact: boolean) => (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="relative">
          <MagnifyingGlassIcon className={`pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
          <input
            type="text"
            aria-label={t('header.mainSearchPlaceholder')}
            placeholder={t('header.mainSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            tabIndex={compact && !showCompactSearch ? -1 : undefined}
            className={`w-full pl-10 sm:pl-12 pr-4 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-emerald-500 focus:outline-none rounded-xl ${compact ? 'py-2 text-sm' : 'py-4 text-base'}`}
          />
        </div>
      </div>

      {/* Modo IA */}
      <button
        type="button"
        onClick={() => openChat(searchTerm)}
        tabIndex={compact && !showCompactSearch ? -1 : undefined}
        className="relative group flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
      >
        <div className="absolute -inset-[2px] rounded-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300 bg-emerald-200" />
        <div className={`relative bg-white dark:bg-gray-800 rounded-xl flex items-center gap-2 shadow-sm ${compact ? 'px-3 py-2' : 'px-5 py-3.5'}`}>
          <svg className={compact ? 'h-4 w-4' : 'h-5 w-5'} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
              className="fill-emerald-600 dark:fill-emerald-400" />
          </svg>
          <span className={`font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap hidden sm:inline ${compact ? 'text-sm' : 'text-base'}`}>
            {t('view.ia_mode')}
          </span>
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Portada: eslogan y búsqueda, en el flujo normal de la página */}
      {!isDrawingEnabled && viewMode !== 'map' && (
        <div className="page-container pt-8 pb-4">
          <div className="w-full rounded-3xl bg-emerald-600 shadow-xl px-4 py-5 sm:px-8 sm:py-6">
            <div className="mb-5 rounded-2xl bg-black/30 px-6 md:px-8 py-4 text-center">
              <h1 className="font-sans text-sm sm:text-lg md:text-xl font-semibold text-white tracking-wide text-balance leading-snug">
                {t('header.slogan')}
              </h1>
            </div>
            <div ref={heroSearchRef}>{renderSearchRow(false)}</div>
          </div>
        </div>
      )}

      {/* Barra compacta fija (no ocupa sitio en la página) */}
      {!isDrawingEnabled && viewMode !== 'map' && (
        <div
          aria-hidden={!showCompactSearch}
          className={`fixed inset-x-0 top-0 z-40 transition-transform duration-200 ease-out motion-reduce:transition-none ${showCompactSearch ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="page-container pt-2.5">
            <div className="rounded-3xl bg-emerald-600 shadow-lg px-2.5 py-2">
              {renderSearchRow(true)}
            </div>
          </div>
        </div>
      )}

      {/* Map Controls Bar - Sticky in Map Mode */}
      <div
        id="map-controls-bar"
        className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-sm z-[30] transition-all ${viewMode === 'map' ? 'sticky top-[72px] sm:top-[80px]' : 'relative'
          } ${!isScrolled ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
      >
        <div className="page-container py-2 sm:py-3 relative">

          <div className="flex flex-row justify-between items-center gap-2 sm:gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink min-w-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-gray-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{t('common.filters')}</span>
              </motion.button>

              {/* Drawing Tools - Only show in map mode */}
              {viewMode === 'map' && (
                <div className="relative isolate flex items-center gap-1.5 sm:gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleDrawingMode}
                    className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border transition-all z-10 ${isDrawingEnabled
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:shadow-md'
                      }`}
                  >
                    <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">{t('map.drawArea')}</span>
                  </motion.button>

                  {/* Tutorial Highlight Animation for "Draw Area" */}
                  {!hasZone && !isDrawingEnabled && (
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 1.5,
                        ease: "easeInOut"
                      }}
                      className="absolute -inset-1.5 bg-emerald-400/30 rounded-xl z-0 pointer-events-none"
                    />
                  )}
                  {/* Ping effect for "Draw Area" */}
                  {!hasZone && !isDrawingEnabled && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 z-20">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}

                  {hasZone && (
                    <motion.button
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={clearDrawnArea}
                      aria-label={t('map.clearZone')}
                      className="flex items-center gap-1.5 sm:gap-2 bg-red-500 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-red-600 hover:bg-red-600 transition-all z-10 relative"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('map.clearZone')}</span>
                    </motion.button>
                  )}
                </div>
              )}

              {/* En móvil, con la barra llena, basta el número; el texto completo queda para lectores de pantalla */}
              <div className="min-w-0 truncate text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <span className={viewMode === 'map' ? 'hidden sm:inline' : undefined}>
                  {hasZone
                    ? t('view.propertiesInArea', { count: filteredProperties.length })
                    : t('view.properties', { count: filteredProperties.length })}
                </span>
                {viewMode === 'map' && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200 sm:hidden"
                    aria-label={hasZone ? t('view.propertiesInArea', { count: filteredProperties.length }) : t('view.properties', { count: filteredProperties.length })}>
                    {filteredProperties.length}
                  </span>
                )}
              </div>
            </div>

            {/* Right Controls - View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 sm:p-1 flex-shrink-0">
              {/* Grid Toggle */}
              <button
                onClick={() => { setViewMode('grid'); setViewLayout('grid'); }}
                className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all ${viewMode === 'grid' && viewLayout === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                title="Vista Cuadrícula"
              >
                <ViewColumnsIcon className="h-4 w-4" />
                <span className="text-xs font-semibold hidden">{t('view.grid', 'Grid')}</span>
              </button>

              {/* List Toggle */}
              <button
                onClick={() => { setViewMode('grid'); setViewLayout('list'); }}
                className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all ${viewMode === 'grid' && viewLayout === 'list'
                  ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'
                  }`}
                title="Vista Lista"
              >
                <Bars3Icon className="h-4 w-4" />
                <span className="text-xs font-semibold hidden">{t('view.list')}</span>
              </button>

              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>

              {/* Map Toggle */}
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all ${viewMode === 'map'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50'
                  }`}
              >
                <MapIcon className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-semibold">{t('view.map')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-gray-800 shadow-sm relative z-20"
        >
          <div className="page-container py-6">
            {/* Row 1: Main filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('filters.propertyType')}
                </label>
                <select
                  value={normalizeType(filters.type)}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="">{t('filters.allTypes')}</option>
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{t(`property.${type.value}`, type.label)}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  {t('filters.location')}
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all appearance-none cursor-pointer hover:border-emerald-300"
                >
                  <option value="">{t('filters.allLocations')}</option>
                  {locationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-5 border-t border-emerald-100 dark:border-gray-800">
              <div className="flex-1 w-full max-w-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {t('filters.priceRange', 'Rango de Precio')}
                  </label>

                  {/* Manual Inputs + Status */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                      <input
                        type="number"
                        value={filters.minPrice === 0 ? '' : filters.minPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFilterChange('minPrice', val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                        }}
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                        placeholder="Min"
                      />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative flex-1 sm:w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                      <input
                        type="number"
                        value={filters.maxPrice === 1000000 ? '' : filters.maxPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFilterChange('maxPrice', val === '' ? 1000000 : Math.max(0, parseInt(val) || 0));
                        }}
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="px-3 pb-2 mt-4 sm:mt-0">
                  <Slider
                    value={[filters.minPrice, Math.min(filters.maxPrice, MAX_PRICE)]}
                    max={MAX_PRICE}
                    step={10000}
                    onValueChange={(val) => {
                      handleFilterChange('minPrice', val[0]);
                      handleFilterChange('maxPrice', val[1]);
                    }}
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium px-1">
                    <span>0 €</span>
                    <span>500k €</span>
                    <span>1M+ €</span>
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
            <div className={`page-container relative transition-all duration-500 ease-in-out ${isDrawingEnabled ? 'mt-4 mb-8 md:mt-6 md:mb-12' : 'my-8 md:my-16'}`}>

              {/* Mini Tutorial — Drawing Instructions */}
              <AnimatePresence>
                {showMapToast && (
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                    onClick={() => setShowMapToast(false)}
                  >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    {/* Tutorial Card */}
                    <motion.div
                      initial={false}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 30 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.1 }}
                      className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-xl">
                          <PencilIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('map.tutorial.title')}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('map.tutorial.subtitle')}</p>
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="space-y-4 mb-6">
                        {/* Step 1 */}
                        <motion.div
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black">1</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('map.tutorial.step1.title')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('map.tutorial.step1.desc')}</p>
                          </div>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black">2</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('map.tutorial.step2.title')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('map.tutorial.step2.desc')}</p>
                          </div>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black">3</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('map.tutorial.step3.title')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('map.tutorial.step3.desc')}</p>
                          </div>
                        </motion.div>
                      </div>

                      {/* CTA */}
                      <motion.button
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        onClick={() => setShowMapToast(false)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-[0.98]"
                      >
                        {t('map.tutorial.start')}
                      </motion.button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4">
              <div className="map-wrapper min-w-0 flex-1" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                <style>
                  {`
                  .map-fullscreen-container:fullscreen {
                    width: 100vw !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #f9fafb;
                  }
                  .map-fullscreen-container:fullscreen .page-container {
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





                {/* Tras mover el mapa: filtra por lo que se ve */}
                {pendingBounds && !isDrawingEnabled && !hasDrawnArea && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-14">
                    <button type="button" onClick={searchThisArea}
                      className="pointer-events-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                      <MagnifyingGlassIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {t('map.searchHere')}
                    </button>
                  </div>
                )}

                {/* Sin resultados: se explica en lugar de mostrar un mapa vacío */}
                {filteredProperties.length === 0 && !isDrawingEnabled && (
                  <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center p-4">
                    <div role="status" className="pointer-events-auto max-w-sm rounded-2xl border border-gray-200 bg-white/95 p-5 text-center shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
                      <MapIcon className="mx-auto mb-2 h-8 w-8 text-gray-400" aria-hidden="true" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {properties.length === 0 ? t('map.noListings.title') : t('map.noResults.title')}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {properties.length === 0 ? t('map.noListings.desc') : t('map.noResults.desc')}
                      </p>
                      {properties.length > 0 && (isSearchActive || hasZone) && (
                        <button type="button" onClick={resetAll}
                          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                          {t('common.clearFilters')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Resultados que no se pueden situar: se avisa para que no parezca que faltan */}
                {unmappedCount > 0 && !isDrawingEnabled && (
                  <div className="absolute bottom-6 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-gray-200 bg-white/95 py-1.5 pl-3 pr-1.5 text-xs text-gray-700 shadow-md backdrop-blur dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-200">
                    <span className="truncate">{t('map.unmapped', { count: unmappedCount })}</span>
                    <button type="button" onClick={() => { setViewMode('grid'); setViewLayout('list'); }}
                      className="flex-shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 lg:hidden">
                      {t('map.seeInList')}
                    </button>
                  </div>
                )}

                {/* Barra de dibujo: indica qué hacer y cabe en un móvil */}
                {isDrawingEnabled && (
                  <div className="absolute inset-x-0 bottom-4 z-[1000] flex justify-center px-3 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
                      <p className="px-2 pb-2 pt-1 text-center text-xs text-gray-600 dark:text-gray-300 sm:text-sm" aria-live="polite">
                        {drawPoints < 3
                          ? t('map.draw.hint', { count: drawPoints })
                          : t('map.draw.hintClose', { count: drawPoints })}
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button type="button" onClick={() => drawRef.current?.undo()} disabled={drawPoints === 0}
                          className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-700">
                          <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />
                          {t('map.draw.undo')}
                        </button>
                        <button type="button" onClick={() => drawRef.current?.reset()} disabled={drawPoints === 0}
                          className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-700">
                          <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
                          {t('map.draw.restart')}
                        </button>
                        <button type="button" onClick={() => drawRef.current?.finish()} disabled={drawPoints < 3}
                          className="flex flex-col items-center gap-1 rounded-xl bg-emerald-600 px-1 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          {t('map.draw.finish')}
                        </button>
                        <button type="button" onClick={() => setIsDrawingEnabled(false)}
                          className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                          {t('map.draw.exit')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {canFullscreen && (
                  <button type="button" onClick={toggleFullscreen}
                    aria-label={isFullscreen ? t('map.exitFullscreen') : t('map.fullscreen')} title={isFullscreen ? t('map.exitFullscreen') : t('map.fullscreen')}
                    className="absolute left-3 top-3 z-[1000] rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-md hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
                  </button>
                )}

                <MapContainer
                  center={murciaCenter}
                  zoom={9}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                  zoomControl={false}
                >
                  <ZoomControl position="topright" zoomInTitle={t('map.zoomIn')} zoomOutTitle={t('map.zoomOut')} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController points={mapPoints} bounds={boundsFilter} fitKey={mapFitKey} sizeKey={`${isFullscreen}|${showResultsList}`} userMoveRef={userMoveRef} />
                  <MapMoveWatcher userMoveRef={userMoveRef} onUserMove={setPendingBounds} />

                  <DrawControl
                    ref={drawRef}
                    onCreated={handleDrawCreated}
                    onPointsChange={setDrawPoints}
                    isEnabled={isDrawingEnabled}
                  />

                  {/* Render the extracted polygon area visually */}
                  {hasDrawnArea && drawnArea && Array.isArray(drawnArea) && (
                    <Polygon
                      positions={drawnArea}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }}
                    />
                  )}

                  {mappableProperties.map((property) => (
                    <Marker
                      // Mientras se dibuja, los precios no capturan los toques: así se pueden marcar puntos encima
                      key={`${property.id}-${isDrawingEnabled ? 'draw' : 'view'}`}
                      interactive={!isDrawingEnabled}
                      position={[property.coordinates.lat, property.coordinates.lng]}
                      icon={createPriceMarker(property.price, selectedProperty?.id === property.id || hoveredId === property.id)}
                      zIndexOffset={hoveredId === property.id ? 1000 : 0}
                      eventHandlers={{
                        click: () => handleMarkerClick(property),
                      }}
                    >
                      <Popup>
                        <div className="w-56">
                          {property.images?.[0] ? (
                            <img src={property.images[0]} alt="" loading="lazy"
                              className="mb-2 h-32 w-full rounded-lg object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div className="mb-2 flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-gray-400"><HomeIcon className="h-8 w-8" /></div>
                          )}
                          <p className="font-display text-lg font-semibold tabular-nums text-gray-900">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)}
                          </p>
                          <p className="font-semibold text-gray-900">{property.title}</p>
                          <p className="mb-2 text-sm text-gray-600">
                            {[property.location, property.bedrooms ? `${property.bedrooms} hab.` : null, property.area ? `${property.area} m²` : null].filter(Boolean).join(' · ')}
                          </p>
                          <button onClick={() => handleViewDetails(property.id)}
                            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                            {t('map.viewListing')}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Ordenador: lista de resultados junto al mapa; pasar por una ficha resalta su precio en el mapa */}
              {showResultsList && (
                <aside aria-label={t('map.results')}
                  className="hidden w-[22rem] flex-shrink-0 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 lg:flex"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                  <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                    {hasZone
                      ? t('view.propertiesInArea', { count: filteredProperties.length })
                      : t('view.properties', { count: filteredProperties.length })}
                  </p>
                  <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                    {filteredProperties.map(property => {
                      const active = hoveredId === property.id || selectedProperty?.id === property.id;
                      return (
                        <li key={property.id} id={`map-result-${property.id}`}>
                          <button type="button" onClick={() => handleViewDetails(property.id)}
                            onMouseEnter={() => setHoveredId(property.id)} onMouseLeave={() => setHoveredId(null)}
                            onFocus={() => setHoveredId(property.id)} onBlur={() => setHoveredId(null)}
                            className={`flex w-full gap-3 p-3 text-left transition-colors ${active ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            {property.images?.[0] ? (
                              <img src={property.images[0]} alt="" loading="lazy" className="h-16 w-24 flex-shrink-0 rounded-lg object-cover"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                            ) : (
                              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-700"><HomeIcon className="h-6 w-6" /></div>
                            )}
                            <div className="min-w-0">
                              <p className="font-display font-semibold tabular-nums text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price)}
                              </p>
                              <p className="truncate text-sm text-gray-800 dark:text-gray-200">{property.title}</p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {[property.location, property.bedrooms ? `${property.bedrooms} hab.` : null, property.area ? `${property.area} m²` : null].filter(Boolean).join(' · ')}
                              </p>
                              {!hasRealCoordinates(property) && (
                                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{t('map.noLocation')}</p>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </aside>
              )}
              </div>
            </div>
          </div>
        ) : (
          /* Grid/List View */
          <div className="page-container py-6 md:py-8">
            <div className={
              viewLayout === 'list'
                ? "flex flex-col gap-6"
                : "grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
            }>
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={false}
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
      </div>
    </div>
  );
}
