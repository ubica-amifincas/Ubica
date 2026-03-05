import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  MapPinIcon,
  BanknotesIcon,
  HomeIcon,
  CalendarIcon,
  FireIcon,
  StarIcon,
  ShareIcon,
  HeartIcon,
  PhoneIcon,
  EnvelopeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyCard } from '../components/property/PropertyCard';
import { PageLoader } from '../components/common/LoadingSpinner';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import appService from '../services';
import type { Property } from '../types';

export function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Skeleton */}
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg"></div>

            {/* Info Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-3 text-right">
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full ml-auto"></div>
                </div>
              </div>

              {/* Stats Grid Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-gray-200 dark:border-gray-700">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center space-y-2">
                    <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Description Skeleton */}
              <div className="space-y-3">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>

            {/* Map Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 h-[400px]">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              <div className="h-[300px] w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-8">
            {/* Contact Form Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>

            {/* Similar Properties Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [messageForm, setMessageForm] = useState({ name: '', email: '', message: '' });
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const { user } = useAuth();

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const foundProperty = await appService.getProperty(Number(id));
        setProperty(foundProperty);

        const allData = await appService.getProperties(0, 100);
        setAllProperties(allData);

        const similar = allData
          .filter(
            (p: Property) =>
              p.id !== foundProperty.id &&
              (p.type === foundProperty.type || p.location === foundProperty.location)
          )
          .slice(0, 3);
        setSimilarProperties(similar);

        // Load favorites if user
        if (user?.role === 'user' && foundProperty) {
          appService.getFavorites().then(favs => {
            setIsFavorite(favs.some(f => f.id === foundProperty.id));
          }).catch(console.error);
        }

      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProperty();
    }
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleViewDetails = (propertyId: number) => {
    navigate(`/property/${propertyId}`);
  };

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await appService.removeFavorite(Number(id));
        setIsFavorite(false);
      } else {
        await appService.addFavorite(Number(id));
        setIsFavorite(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !messageForm.message.trim()) return;
    setMessageStatus('sending');
    try {
      await appService.sendMessage({
        property_id: Number(id),
        realtor_id: property?.realtor_id,
        receiver_id: property?.owner_id,
        content: messageForm.message
      });
      setMessageStatus('success');
      setMessageForm(f => ({ ...f, message: '' }));
      setTimeout(() => setMessageStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setMessageStatus('error');
    }
  };

  if (loading) {
    return <PropertyDetailSkeleton />;
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Propiedad no encontrada
          </h1>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-white to-emerald-50 dark:bg-gradient-to-r dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors duration-200"
              whileHover={{ x: -4 }}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>{t('details.backToSearch')}</span>
            </motion.button>

            <div className="flex items-center space-x-2">
              <motion.button
                onClick={toggleFavorite}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isFavorite ? (
                  <HeartSolidIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
              </motion.button>

              <motion.button
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ShareIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <motion.div
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="aspect-video relative">
                <img
                  src={property.images[currentImageIndex] || '/images/casa-moderna.jpg'}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />

                {property.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev =>
                        prev === 0 ? property.images.length - 1 : prev - 1
                      )}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev =>
                        prev === property.images.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      →
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {property.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Property Information */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPinIcon className="h-5 w-5 mr-1" />
                    <span>{property.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                    {formatPrice(property.price)}
                  </div>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full dark:bg-green-900/30 dark:text-green-300">
                    {t(`status.${property.status}`)}
                  </span>
                </div>
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {property.bedrooms}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('details.bedrooms')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {property.bathrooms}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('details.bathrooms')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {property.area}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    m²
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {property.yearBuilt}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('details.yearBuilt')}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('details.description')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Features */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('details.features')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {property.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
                    >
                      <StarIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investment Data */}
              {property.investmentData && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    Datos de Inversión
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {property.investmentData.roi}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ROI Anual
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {property.investmentData.rentalYield}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Rentabilidad
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">
                        {property.investmentData.monthsOnMarket}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Meses en mercado
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Map */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ubicación
                </h2>
              </div>
              <div className="h-[400px]">
                <MapContainer
                  center={[property.coordinates.lat, property.coordinates.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                  attributionControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[property.coordinates.lat, property.coordinates.lng]}
                    icon={L.icon({
                      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">{property.title}</h3>
                        <p className="text-sm">{property.location}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Form */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('details.contact')}
              </h2>

              <div className="space-y-4">
                <motion.button
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PhoneIcon className="h-5 w-5" />
                  <span>{t('details.callNow')}</span>
                </motion.button>

                {user ? (
                  <>
                    <motion.button
                      onClick={() => setShowContactForm(!showContactForm)}
                      className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <EnvelopeIcon className="h-5 w-5" />
                      <span>{showContactForm ? 'Cerrar chat' : 'Enviar mensaje'}</span>
                    </motion.button>

                    <AnimatePresence>
                      {showContactForm && (
                        <motion.div
                          className="mt-4"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <form onSubmit={handleSendMessage} className="relative">
                            <textarea
                              placeholder="Escribe tu consulta aquí..."
                              rows={3}
                              required
                              value={messageForm.message}
                              onChange={e => setMessageForm(f => ({ ...f, message: e.target.value }))}
                              className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none transition-all duration-200"
                            />
                            <button
                              type="submit"
                              disabled={messageStatus === 'sending' || !messageForm.message.trim()}
                              className="absolute right-2 bottom-3 p-2 text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 transition-colors"
                            >
                              <PaperAirplaneIcon className={`h-6 w-6 ${messageStatus === 'sending' ? 'animate-pulse' : ''}`} />
                            </button>
                          </form>
                          {messageStatus === 'success' && (
                            <motion.p
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-emerald-600 mt-2 text-center font-medium"
                            >
                              ✓ Mensaje enviado. Ver en Dashboard
                            </motion.p>
                          )}
                          {messageStatus === 'error' && (
                            <p className="text-xs text-red-600 mt-2 text-center">Error al enviar el mensaje.</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-center">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-3">
                      Inicia sesión para contactar con esta propiedad y gestionar tus mensajes.
                    </p>
                    <Link
                      to="/login"
                      className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Iniciar Sesión
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                  {t('propertyDetail.similar_title')}
                </h2>
                <div className="space-y-4">
                  {similarProperties.map((similarProperty) => (
                    <PropertyCard
                      key={similarProperty.id}
                      property={similarProperty}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
