import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { propertyPath } from '../seo/pages';
import { setPageHead } from '../hooks/useDocumentTitle';
import { UBICA_ORIGIN } from '../utils/site';
import {
  ArrowLeftIcon,
  MapPinIcon,
  HomeIcon,
  StarIcon,
  ShareIcon,
  HeartIcon,
  PhoneIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyCard } from '../components/property/PropertyCard';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../contexts/AuthContext';
import appService from '../services';
import type { Property } from '../types';

export function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[4/3] sm:aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mismo criterio de color que la tarjeta: ofertas en verde, reservada en ámbar, cerradas en gris
const statusChipClass = (status: string) => {
  switch (status) {
    case 'for-sale':
    case 'for-rent':
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'reserved':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
};

const specGridCols: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

export default function PropertyDetail() {
  const params = useParams<{ id?: string; slug?: string }>();
  // /inmueble/123-piso-en-murcia o la antigua /property/123
  const id = params.id ?? params.slug?.match(/^\d+/)?.[0];
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [validImages, setValidImages] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [messageForm, setMessageForm] = useState({ name: '', email: '', message: '' });
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [shareCopied, setShareCopied] = useState(false);

  // "Contactar" (panel lateral y barra inferior) lleva a la sección de contacto y pone el foco en ella
  const contactSectionRef = useRef<HTMLElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const loginLinkRef = useRef<HTMLAnchorElement>(null);
  const [focusContactPending, setFocusContactPending] = useState(false);

  // Touch/swipe state for carousel
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
    if (validImages.length <= 1) return;
    if (distance > minSwipeDistance) {
      setCurrentImageIndex(prev => (prev + 1) % validImages.length);
    } else if (distance < -minSwipeDistance) {
      setCurrentImageIndex(prev => (prev - 1 + validImages.length) % validImages.length);
    }
  };

  const handleImageError = () => {
    setValidImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== currentImageIndex);
      if (currentImageIndex >= filtered.length) {
        setCurrentImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const { user } = useAuth();

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const foundProperty = await appService.getProperty(Number(id));
        setProperty(foundProperty);
        if (foundProperty) {
          // Una sola dirección por inmueble: la legible (la misma que usa Google)
          const canonical = propertyPath(foundProperty);
          if (location.pathname !== canonical) navigate(`${canonical}${location.search}${location.hash}`, { replace: true });
          const summary = (foundProperty.description || '').replace(/\s+/g, ' ').trim().slice(0, 155);
          setPageHead(`${foundProperty.title} | Ubica`, summary || foundProperty.title, `${UBICA_ORIGIN}${canonical}`);
        }

        // Filter valid images
        const imgs = foundProperty.images?.filter((img: string) => img && typeof img === 'string' && img.trim() !== '') || [];
        setValidImages(imgs);
        setCurrentImageIndex(0);

        const allData = await appService.getProperties(0, 100);

        const similar = allData
          .filter(
            (p: Property) =>
              p.id !== foundProperty.id &&
              p.status !== 'in-use' &&
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

  // La barra fija inferior (móvil/tablet) reserva su alto al final del body para no tapar contenido ni pie
  useEffect(() => {
    if (!property) return;
    document.body.classList.add('has-bottom-cta');
    return () => document.body.classList.remove('has-bottom-cta');
  }, [property]);

  // Foco tras abrir el formulario (necesita que el textarea ya esté montado)
  useEffect(() => {
    if (!focusContactPending) return;
    const target = user ? messageInputRef.current : loginLinkRef.current;
    target?.focus({ preventScroll: true });
    setFocusContactPending(false);
  }, [focusContactPending, showContactForm, user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleViewDetails = (propertyId: number) => {
    const target = similarProperties.find(p => p.id === propertyId);
    navigate(target ? propertyPath(target) : `/inmueble/${propertyId}`);
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.title, url });
      } catch {
        // El usuario canceló el diálogo de compartir
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const goToContact = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    contactSectionRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (user) setShowContactForm(true);
    setFocusContactPending(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !messageForm.message.trim()) return;
    setMessageStatus('sending');
    try {
      await appService.sendMessage({
        // El backend entrega el mensaje al propietario del anuncio
        property_id: Number(id),
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
            {t('details.notFound')}
          </h1>
          <Link
            to="/"
            className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            {t('details.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  const isRent = property.status === 'for-rent';
  const pricePerM2 = !isRent && property.area > 0 && property.price > 0 ? Math.round(property.price / property.area) : null;
  const locationText = [property.address, property.location]
    .map(s => s?.trim())
    .filter((s, i, arr): s is string => !!s && !(i === 1 && arr[0]?.toLowerCase().includes(s.toLowerCase())))
    .join(', ');

  const specs = [
    property.bedrooms > 0 ? { value: property.bedrooms, label: t('details.spec_bedrooms') } : null,
    property.bathrooms > 0 ? { value: property.bathrooms, label: t('details.spec_bathrooms') } : null,
    property.area > 0 ? { value: property.area, label: 'm²' } : null,
    property.yearBuilt ? { value: property.yearBuilt, label: t('details.spec_year') } : null,
  ].filter((s): s is { value: number; label: string } => s !== null);

  const priceNode = (
    <>
      {formatPrice(property.price)}
      {isRent && <span className="ml-0.5 font-sans text-base font-medium text-gray-500 dark:text-gray-400">{t('details.per_month')}</span>}
    </>
  );

  const iconButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';
  const cardClass = 'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cabecera: volver */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>{t('details.backToSearch')}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Móvil: galería, resumen y contenido en ese orden. lg+: galería y contenido a la izquierda (7/12),
            resumen fijo a la derecha (5/12) ocupando las dos filas para que el sticky tenga recorrido. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Galería */}
          <div className="min-w-0 lg:col-span-7 lg:row-start-1">
            <div className={`${cardClass} overflow-hidden`}>
              <div
                className="relative aspect-[4/3] sm:aspect-video bg-gray-100 dark:bg-gray-700"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {validImages.length > 0 ? (
                  <img
                    key={currentImageIndex}
                    src={validImages[currentImageIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-emerald-50 dark:bg-gray-700">
                    <div className="rounded-full bg-white/60 dark:bg-gray-600/40 p-6 mb-3">
                      <HomeIcon className="h-16 w-16 text-emerald-500 dark:text-emerald-300" />
                    </div>
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                      Sin imagen
                    </span>
                  </div>
                )}

                {validImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={t('details.photo_prev')}
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? validImages.length - 1 : prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('details.photo_next')}
                      onClick={() => setCurrentImageIndex(prev => prev === validImages.length - 1 ? 0 : prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                      {currentImageIndex + 1} / {validImages.length}
                    </span>
                  </>
                )}
              </div>

              {/* Miniaturas */}
              {validImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-2">
                  {validImages.map((img, index) => (
                    <button
                      key={img + index}
                      type="button"
                      aria-label={t('details.photo_n', { n: index + 1 })}
                      aria-current={index === currentImageIndex}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${index === currentImageIndex ? 'border-emerald-600' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumen: precio, qué es, dónde y contacto */}
          <aside className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
            {/* top: 64px de la barra de navegación (sticky) + 24px de aire */}
            <section aria-label={t('details.summary')} className={`${cardClass} p-5 sm:p-6 lg:sticky lg:top-[88px]`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusChipClass(property.status)}`}>
                  {t(`status.${property.status}`)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? t('details.favorite_remove') : t('details.favorite_add')}
                    title={isFavorite ? t('details.favorite_remove') : t('details.favorite_add')}
                    className={iconButtonClass}
                  >
                    {isFavorite ? <HeartSolidIcon className="h-5 w-5 text-red-500" /> : <HeartIcon className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label={t('details.share')}
                    title={t('details.share')}
                    className={iconButtonClass}
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {priceNode}
                </p>
                {pricePerM2 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{formatPrice(pricePerM2)}/m²</span>
                )}
              </div>

              <h1 className="mt-2 font-display text-xl sm:text-2xl font-semibold leading-snug text-gray-900 dark:text-white text-balance">
                {property.title}
              </h1>

              {locationText && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-start gap-1.5 text-sm text-gray-600 underline-offset-4 hover:text-emerald-700 hover:underline dark:text-gray-300 dark:hover:text-emerald-300"
                >
                  <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{locationText}</span>
                </a>
              )}

              {specs.length > 0 && (
                <dl className={`mt-5 grid ${specGridCols[specs.length]} divide-x divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700`}>
                  {specs.map(spec => (
                    <div key={spec.label} className="flex flex-col-reverse items-center px-2 py-3 text-center">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">{spec.label}</dt>
                      <dd className="font-display text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <button
                type="button"
                onClick={goToContact}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
              >
                <EnvelopeIcon className="h-5 w-5" />
                {t('details.contact')}
              </button>

              <p role="status" className="mt-2 empty:mt-0 text-center text-xs text-emerald-700 dark:text-emerald-300">
                {shareCopied ? t('details.link_copied') : ''}
              </p>
            </section>
          </aside>

          {/* Contenido */}
          <div className="min-w-0 space-y-6 lg:col-span-7 lg:row-start-2">
            <div className={`${cardClass} p-5 sm:p-6`}>
              {property.description?.trim() && (
                <section>
                  <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {t('details.description')}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </section>
              )}

              {property.features?.length > 0 && (
                <section className={property.description?.trim() ? 'mt-6' : ''}>
                  <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {t('details.features')}
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {property.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <StarIcon className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Investment Data */}
              {property.investmentData && (
                <section className="mt-6 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950">
                  <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {t('details.investment')}
                  </h2>
                  <dl className="grid grid-cols-3 gap-4">
                    {[
                      { value: `${property.investmentData.roi}%`, label: t('details.roi') },
                      { value: `${property.investmentData.rentalYield}%`, label: t('details.yield') },
                      { value: property.investmentData.monthsOnMarket, label: t('details.timeOnMarket') },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col-reverse">
                        <dt className="text-sm text-gray-600 dark:text-gray-300">{item.label}</dt>
                        <dd className="text-lg font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>

            {/* Contacto: destino del botón "Contactar" */}
            <section
              id="contacto"
              ref={contactSectionRef}
              aria-labelledby="contact-title"
              className={`${cardClass} scroll-mt-24 p-5 sm:p-6`}
            >
              <h2 id="contact-title" className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('details.contact')}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <PhoneIcon className="h-5 w-5" />
                  <span>{t('details.callNow')}</span>
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={() => setShowContactForm(!showContactForm)}
                    aria-expanded={showContactForm}
                    aria-controls="contact-form"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <EnvelopeIcon className="h-5 w-5" />
                    <span>{showContactForm ? t('details.closeChat') : t('details.sendMessage')}</span>
                  </button>
                ) : null}
              </div>

              {user ? (
                showContactForm && (
                  <div id="contact-form" className="mt-4">
                    <form onSubmit={handleSendMessage} className="relative">
                      <label htmlFor="contact-message" className="sr-only">{t('details.writeMessage')}</label>
                      <textarea
                        id="contact-message"
                        ref={messageInputRef}
                        placeholder={t('details.writeMessage')}
                        rows={3}
                        required
                        value={messageForm.message}
                        onChange={e => setMessageForm(f => ({ ...f, message: e.target.value }))}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none"
                      />
                      <button
                        type="submit"
                        aria-label={t('details.sendMessage')}
                        disabled={messageStatus === 'sending' || !messageForm.message.trim()}
                        className="absolute right-2 bottom-3 p-2 text-emerald-700 hover:text-emerald-800 disabled:text-gray-400 dark:text-emerald-300 transition-colors"
                      >
                        <PaperAirplaneIcon className={`h-6 w-6 ${messageStatus === 'sending' ? 'animate-pulse' : ''}`} />
                      </button>
                    </form>
                    {messageStatus === 'success' && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 text-center font-medium">
                        {t('details.messageSent')}
                      </p>
                    )}
                    {messageStatus === 'error' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">{t('details.sendError')}</p>
                    )}
                  </div>
                )
              ) : (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-3">
                    {t('details.contact_login')}
                  </p>
                  <Link
                    ref={loginLinkRef}
                    to="/login"
                    className="inline-block rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                  >
                    {t('nav.login')}
                  </Link>
                </div>
              )}
            </section>

            {/* Map */}
            <section aria-labelledby="map-title" className={`${cardClass} overflow-hidden`}>
              <div className="px-5 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 id="map-title" className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  {t('details.location_title')}
                </h2>
              </div>
              <div className="h-[320px] sm:h-[400px]">
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
                        <p className="text-sm">{locationText}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </section>
          </div>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <section aria-labelledby="similar-title" className="mt-10">
            <h2 id="similar-title" className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-5">
              {t('propertyDetail.similar_title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {similarProperties.map((similarProperty) => (
                <PropertyCard
                  key={similarProperty.id}
                  property={similarProperty}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Móvil/tablet: precio y "Contactar" siempre a mano. Oculta en lg+, donde está el panel lateral. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden dark:border-gray-700 dark:bg-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-gray-900 dark:text-white tabular-nums">
              {priceNode}
            </p>
            <p className="truncate text-xs text-gray-600 dark:text-gray-300">{property.title}</p>
          </div>
          <button
            type="button"
            onClick={goToContact}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          >
            <EnvelopeIcon className="h-5 w-5" />
            {t('details.contact')}
          </button>
        </div>
      </div>
    </div>
  );
}
