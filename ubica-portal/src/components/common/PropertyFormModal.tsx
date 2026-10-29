import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, MapPinIcon, PhotoIcon, TrashIcon, StarIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth, useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';
import { buttonClass } from '../dashboard/ui';
import { PROPERTY_STATUS_OPTIONS, PROPERTY_TYPES, getStatusLabel, normalizeType } from '../../utils/propertyStatus';

const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
});

// Centro del mapa cuando el inmueble aún no tiene ubicación (Región de Murcia)
const REGION_CENTER = { lat: 37.9922, lng: -1.1307 };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MURCIA_TOWNS = [
    'Murcia', 'Cartagena', 'Lorca', 'Molina de Segura', 'Alcantarilla', 'Mazarrón', 'Águilas', 'Cieza',
    'Yecla', 'Torre Pacheco', 'San Javier', 'San Pedro del Pinatar', 'Los Alcázares', 'Totana', 'Caravaca de la Cruz',
    'Jumilla', 'Alhama de Murcia', 'Las Torres de Cotillas', 'Santomera', 'Archena', 'La Manga del Mar Menor',
];
const ORIENTATIONS = ['Norte', 'Sur', 'Este', 'Oeste', 'Noreste', 'Noroeste', 'Sureste', 'Suroeste'];
const ENERGY_RATINGS = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'En trámite'];
const COMMON_FEATURES = [
    'Piscina', 'Jardín', 'Garaje', 'Trastero', 'Terraza', 'Balcón', 'Ascensor', 'Aire acondicionado',
    'Calefacción', 'Amueblado', 'Cocina equipada', 'Vistas al mar', 'Cerca de la playa', 'Accesible',
];

/** Los números se guardan como texto mientras se escriben: un campo vacío no es un 0 inventado. */
interface FormState {
    title: string;
    type: string;
    status: string;
    price: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    yearBuilt: string;
    orientation: string;
    energyRating: string;
    location: string;
    address: string;
    description: string;
    features: string[];
    purchasePrice: string;
    totalCost: string;
    monthlyCost: string;
    monthlyIncome: string;
}

const EMPTY_FORM: FormState = {
    // Los inmuebles nuevos empiezan como borrador: no se publican hasta elegir "En venta" o "En alquiler"
    title: '', type: 'flat', status: 'draft', price: '', bedrooms: '', bathrooms: '', area: '',
    yearBuilt: '', orientation: '', energyRating: '', location: '', address: '', description: '', features: [],
    purchasePrice: '', totalCost: '', monthlyCost: '', monthlyIncome: '',
};

const str = (value: unknown) => (value === null || value === undefined || value === 0 ? '' : String(value));
const num = (value: string) => (value.trim() === '' ? undefined : Number(value.replace(',', '.')));

function formFromProperty(p: Property): FormState {
    return {
        title: p.title || '',
        type: normalizeType(p.type) || 'flat',
        status: p.status || 'for-sale',
        price: str(p.price),
        bedrooms: p.bedrooms === 0 ? '0' : str(p.bedrooms),
        bathrooms: p.bathrooms === 0 ? '0' : str(p.bathrooms),
        area: str(p.area),
        yearBuilt: str(p.yearBuilt),
        orientation: p.orientation || '',
        energyRating: p.energyRating || '',
        location: p.location || '',
        address: p.address || '',
        description: p.description || '',
        features: p.features || [],
        purchasePrice: str(p.purchasePrice),
        totalCost: str(p.totalCost),
        monthlyCost: str(p.monthlyCost),
        monthlyIncome: str(p.monthlyIncome),
    };
}

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
    return null;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }, [lat, lng, map]);
    return null;
}

const inputClass = (invalid?: boolean) =>
    `block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-900 dark:text-white ${invalid ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`;

function Field({ label, error, hint, required, children, htmlFor, className = '' }: {
    label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; htmlFor: string; className?: string;
}) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}{required && <span className="text-red-600" aria-hidden="true"> *</span>}
            </label>
            {children}
            {error ? (
                <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            ) : null}
        </div>
    );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 border-t border-gray-200 pt-6 first:border-t-0 first:pt-0 dark:border-gray-700">
            <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            {children}
        </section>
    );
}

interface PropertyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData?: Property | null;
}

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [customFeature, setCustomFeature] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [geocoding, setGeocoding] = useState<'idle' | 'busy' | 'not-found'>('idle');
    // Si la portada es una foto nueva, las nuevas van delante de las ya subidas
    const [coverIsNew, setCoverIsNew] = useState(false);
    // Solo el admin asigna la inmobiliaria que gestiona el anuncio
    const [realtorId, setRealtorId] = useState<number | ''>('');
    const [realtors, setRealtors] = useState<{ id: number; label: string }[]>([]);

    const apiService = useAuthenticatedFetch();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const formId = useId();
    const id = (name: string) => `${formId}-${name}`;
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !isAdmin) return;
        apiService.getAllUsers()
            .then(users => setRealtors(users
                .filter(u => u.role === 'realtor')
                .map(u => ({ id: u.id, label: u.company || u.full_name || u.email }))))
            .catch(() => setRealtors([]));
    }, [isOpen, isAdmin, apiService]);

    // Al abrir: datos del inmueble o formulario vacío
    useEffect(() => {
        if (!isOpen) return;
        const next = initialData ? formFromProperty(initialData) : EMPTY_FORM;
        const raw = initialData as (Property & { latitude?: number | null; longitude?: number | null; realtor_id?: number | null }) | null | undefined;
        // Solo hay chincheta si el inmueble tiene coordenadas de verdad (no el centro por defecto)
        setPin(raw && raw.latitude != null && raw.longitude != null ? { lat: raw.latitude, lng: raw.longitude } : null);
        setForm(next);
        setInitialSnapshot(JSON.stringify(next));
        setExistingImages(initialData?.images || []);
        setRealtorId(raw?.realtor_id ?? '');
        setNewFiles([]);
        setFileErrors([]);
        setErrors({});
        setCustomFeature('');
        setGeocoding('idle');
        setCoverIsNew(false);
    }, [isOpen, initialData]);

    useEffect(() => { if (newFiles.length === 0) setCoverIsNew(false); }, [newFiles.length]);

    const isDirty = isOpen && (JSON.stringify(form) !== initialSnapshot || newFiles.length > 0
        || existingImages.length !== (initialData?.images || []).length);

    const requestClose = useCallback(() => {
        if (isSubmitting) return;
        if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
        onClose();
    }, [isDirty, isSubmitting, onClose]);

    // Escape cierra; la página de fondo no se desplaza mientras el formulario está abierto
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, requestClose]);

    useEffect(() => {
        if (isOpen) dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    }, [isOpen]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
    };

    // --- Fotos ---------------------------------------------------------------
    const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
        setNewFiles(prev => [...prev, ...accepted]);
        setFileErrors(rejected.map(r => r.errors[0]?.code === 'file-too-large'
            ? `${r.file.name}: ocupa más de 5 MB`
            : `${r.file.name}: solo se admiten JPG, PNG o WEBP`));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize: MAX_IMAGE_BYTES,
        accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    });

    const previews = useMemo(() => newFiles.map(file => URL.createObjectURL(file)), [newFiles]);
    useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);

    // La primera foto es la portada del anuncio
    const photos = [
        ...existingImages.map((src, i) => ({ key: `e-${i}-${src}`, src, kind: 'existing' as const, index: i })),
        ...previews.map((src, i) => ({ key: `n-${i}-${newFiles[i]?.name}`, src, kind: 'new' as const, index: i })),
    ];

    const removePhoto = (kind: 'existing' | 'new', index: number) => {
        if (kind === 'existing') setExistingImages(prev => prev.filter((_, i) => i !== index));
        else setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const makeCover = (kind: 'existing' | 'new', index: number) => {
        if (kind === 'existing') {
            setExistingImages(prev => [prev[index], ...prev.filter((_, i) => i !== index)]);
            setCoverIsNew(false);
        } else {
            // Una foto nueva pasa delante de todas: se sube primero y se coloca la primera al guardar
            setNewFiles(prev => [prev[index], ...prev.filter((_, i) => i !== index)]);
            setCoverIsNew(true);
        }
    };

    // --- Extras --------------------------------------------------------------
    const toggleFeature = (feature: string) => {
        set('features', form.features.includes(feature)
            ? form.features.filter(f => f !== feature)
            : [...form.features, feature]);
    };
    const addCustomFeature = () => {
        const value = customFeature.trim();
        if (value && !form.features.some(f => f.toLowerCase() === value.toLowerCase())) set('features', [...form.features, value]);
        setCustomFeature('');
    };

    // --- Ubicación -----------------------------------------------------------
    const locateAddress = async () => {
        const query = [form.address, form.location, 'Región de Murcia', 'España'].filter(Boolean).join(', ');
        if (!form.address.trim() && !form.location.trim()) return;
        setGeocoding('busy');
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(query)}`, {
                headers: { 'Accept-Language': 'es' },
            });
            const [hit] = await res.json();
            if (hit) {
                setPin({ lat: Number(Number(hit.lat).toFixed(6)), lng: Number(Number(hit.lon).toFixed(6)) });
                setGeocoding('idle');
            } else {
                setGeocoding('not-found');
            }
        } catch {
            setGeocoding('not-found');
        }
    };

    // --- Guardar -------------------------------------------------------------
    const validate = (): Record<string, string> => {
        const e: Record<string, string> = {};
        const price = num(form.price);
        const area = num(form.area);
        if (!form.title.trim()) e.title = 'Escribe un título';
        if (price === undefined || !(price > 0)) e.price = 'Indica un precio mayor que 0';
        if (area !== undefined && !(area > 0)) e.area = 'La superficie debe ser mayor que 0';
        for (const key of ['bedrooms', 'bathrooms'] as const) {
            const v = num(form[key]);
            if (v !== undefined && (!Number.isInteger(v) || v < 0)) e[key] = 'Debe ser un número entero';
        }
        const year = num(form.yearBuilt);
        if (year !== undefined && (!Number.isInteger(year) || year < 1700 || year > new Date().getFullYear() + 5)) e.yearBuilt = 'Año no válido';
        if (!form.location.trim()) e.location = 'Indica el municipio';
        if (!form.description.trim()) e.description = 'Añade una descripción';
        for (const key of ['purchasePrice', 'totalCost', 'monthlyCost', 'monthlyIncome'] as const) {
            const v = num(form[key]);
            if (v !== undefined && (Number.isNaN(v) || v < 0)) e[key] = 'Debe ser un importe positivo';
        }
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) {
            // Lleva al primer campo con error
            const first = Object.keys(found)[0];
            const el = document.getElementById(id(first));
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus({ preventScroll: true });
            return;
        }

        setIsSubmitting(true);
        try {
            const uploaded = newFiles.length > 0 ? await apiService.uploadImages(newFiles) : [];
            const images = coverIsNew ? [...uploaded, ...existingImages] : [...existingImages, ...uploaded];

            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                type: form.type,
                status: form.status,
                price: num(form.price),
                bedrooms: num(form.bedrooms) ?? null,
                bathrooms: num(form.bathrooms) ?? null,
                area: num(form.area) ?? null,
                yearBuilt: num(form.yearBuilt) ?? null,
                orientation: form.orientation || null,
                energyRating: form.energyRating || null,
                location: form.location.trim(),
                address: form.address.trim(),
                description: form.description.trim(),
                features: form.features,
                images,
                purchasePrice: num(form.purchasePrice) ?? 0,
                totalCost: num(form.totalCost) ?? 0,
                monthlyCost: num(form.monthlyCost) ?? 0,
                monthlyIncome: num(form.monthlyIncome) ?? 0,
            };
            // Sin chincheta no se mandan coordenadas: así no se guarda el centro de Murcia como ubicación
            if (pin) payload.coordinates = pin;

            if (isAdmin) {
                const adminData = { ...payload, realtor_id: realtorId === '' ? null : realtorId };
                if (initialData) await apiService.updateProperty(initialData.id, adminData);
                else await apiService.createProperty(adminData);
            } else if (initialData) {
                await apiService.updateUserProperty(initialData.id, payload);
            } else {
                await apiService.createUserProperty(payload);
            }
            onSave();
            onClose();
        } catch (error) {
            setErrors({ submit: error instanceof Error ? error.message : 'No se pudo guardar el inmueble' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const monthlyCost = num(form.monthlyCost) ?? 0;
    const monthlyIncome = num(form.monthlyIncome) ?? 0;
    const totalCost = num(form.totalCost) ?? 0;
    const cashFlow = monthlyIncome - monthlyCost;
    const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
    const errorCount = Object.keys(errors).filter(k => k !== 'submit').length;
    const describedBy = (name: string) => (errors[name] ? `${id(name)}-error` : undefined);
    // El estado actual del inmueble aunque no esté entre las opciones habituales (p. ej. "available")
    const statusOptions = PROPERTY_STATUS_OPTIONS.some(o => o.value === form.status)
        ? PROPERTY_STATUS_OPTIONS
        : [...PROPERTY_STATUS_OPTIONS, { value: form.status, label: getStatusLabel(form.status) }];
    const typeOptions = PROPERTY_TYPES.some(t => t.value === form.type)
        ? PROPERTY_TYPES
        : [...PROPERTY_TYPES, { value: form.type, label: form.type }];
    const orientationOptions = form.orientation && !ORIENTATIONS.includes(form.orientation) ? [...ORIENTATIONS, form.orientation] : ORIENTATIONS;
    const ratingOptions = form.energyRating && !ENERGY_RATINGS.includes(form.energyRating) ? [...ENERGY_RATINGS, form.energyRating] : ENERGY_RATINGS;

    // En un portal: si algún contenedor de la página tiene transform, un 'fixed' dentro no cubriría toda la pantalla
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-stretch justify-center bg-gray-900/60 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={id('title-heading')}
                className="flex h-full w-full flex-col bg-white shadow-xl dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl"
            >
                {/* Cabecera fija */}
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
                    <div className="min-w-0">
                        <h2 id={id('title-heading')} className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                            {initialData ? 'Editar inmueble' : 'Nuevo inmueble'}
                        </h2>
                        {initialData && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{initialData.title}</p>}
                    </div>
                    <button type="button" onClick={requestClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200" aria-label="Cerrar">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form id={id('form')} onSubmit={handleSubmit} noValidate className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
                    <FormSection title="Datos básicos">
                        <Field label="Título del anuncio" htmlFor={id('title')} error={errors.title} required>
                            <input id={id('title')} type="text" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200}
                                className={inputClass(!!errors.title)} placeholder="Ej.: Piso reformado con terraza en el centro" aria-invalid={!!errors.title} aria-describedby={describedBy('title')} />
                        </Field>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Tipo" htmlFor={id('type')} required>
                                <select id={id('type')} value={form.type} onChange={(e) => set('type', e.target.value)} className={inputClass()}>
                                    {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Estado" htmlFor={id('status')} required>
                                <select id={id('status')} value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass()}>
                                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </Field>
                            <Field label={form.status === 'for-rent' || form.status === 'rented' ? 'Precio (€/mes)' : 'Precio (€)'} htmlFor={id('price')} error={errors.price} required>
                                <input id={id('price')} type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={(e) => set('price', e.target.value)}
                                    className={inputClass(!!errors.price)} placeholder="185000" aria-invalid={!!errors.price} aria-describedby={describedBy('price')} />
                            </Field>
                        </div>
                        {isAdmin && (
                            <Field label="Inmobiliaria que lo gestiona" htmlFor={id('realtor')} hint="La inmobiliaria verá el anuncio en su cartera, sin poder editarlo.">
                                <select id={id('realtor')} value={realtorId} onChange={(e) => setRealtorId(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass()}>
                                    <option value="">Sin asignar</option>
                                    {realtors.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </Field>
                        )}
                    </FormSection>

                    <FormSection title="Características">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Field label="Superficie (m²)" htmlFor={id('area')} error={errors.area}>
                                <input id={id('area')} type="number" inputMode="decimal" min="0" step="any" value={form.area} onChange={(e) => set('area', e.target.value)} className={inputClass(!!errors.area)} placeholder="90" aria-invalid={!!errors.area} aria-describedby={describedBy('area')} />
                            </Field>
                            <Field label="Habitaciones" htmlFor={id('bedrooms')} error={errors.bedrooms}>
                                <input id={id('bedrooms')} type="number" inputMode="numeric" min="0" step="1" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} className={inputClass(!!errors.bedrooms)} placeholder="3" aria-invalid={!!errors.bedrooms} aria-describedby={describedBy('bedrooms')} />
                            </Field>
                            <Field label="Baños" htmlFor={id('bathrooms')} error={errors.bathrooms}>
                                <input id={id('bathrooms')} type="number" inputMode="numeric" min="0" step="1" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} className={inputClass(!!errors.bathrooms)} placeholder="2" aria-invalid={!!errors.bathrooms} aria-describedby={describedBy('bathrooms')} />
                            </Field>
                            <Field label="Año de construcción" htmlFor={id('yearBuilt')} error={errors.yearBuilt}>
                                <input id={id('yearBuilt')} type="number" inputMode="numeric" min="1700" step="1" value={form.yearBuilt} onChange={(e) => set('yearBuilt', e.target.value)} className={inputClass(!!errors.yearBuilt)} placeholder="2005" aria-invalid={!!errors.yearBuilt} aria-describedby={describedBy('yearBuilt')} />
                            </Field>
                            <Field label="Orientación" htmlFor={id('orientation')} className="col-span-1 sm:col-span-2">
                                <select id={id('orientation')} value={form.orientation} onChange={(e) => set('orientation', e.target.value)} className={inputClass()}>
                                    <option value="">Sin indicar</option>
                                    {orientationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Certificado energético" htmlFor={id('energyRating')} className="col-span-1 sm:col-span-2">
                                <select id={id('energyRating')} value={form.energyRating} onChange={(e) => set('energyRating', e.target.value)} className={inputClass()}>
                                    <option value="">Sin indicar</option>
                                    {ratingOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </Field>
                        </div>

                        <fieldset>
                            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Extras</legend>
                            <div className="flex flex-wrap gap-2">
                                {[...COMMON_FEATURES, ...form.features.filter(f => !COMMON_FEATURES.includes(f))].map(feature => {
                                    const on = form.features.includes(feature);
                                    return (
                                        <button key={feature} type="button" onClick={() => toggleFeature(feature)} aria-pressed={on}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on
                                                ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'}`}>
                                            {feature}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <label htmlFor={id('customFeature')} className="sr-only">Otro extra</label>
                                <input id={id('customFeature')} type="text" value={customFeature} onChange={(e) => setCustomFeature(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFeature(); } }}
                                    className={`${inputClass()} max-w-xs`} placeholder="Otro extra (p. ej. Chimenea)" />
                                <button type="button" onClick={addCustomFeature} className={buttonClass.secondary} disabled={!customFeature.trim()}>
                                    <PlusIcon className="h-4 w-4" /> Añadir
                                </button>
                            </div>
                        </fieldset>
                    </FormSection>

                    <FormSection title="Ubicación" description="Pon la chincheta en el mapa para que el inmueble aparezca en la búsqueda por mapa.">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Municipio" htmlFor={id('location')} error={errors.location} required>
                                <input id={id('location')} type="text" list={id('towns')} value={form.location} onChange={(e) => set('location', e.target.value)}
                                    className={inputClass(!!errors.location)} placeholder="Murcia" autoComplete="off" aria-invalid={!!errors.location} aria-describedby={describedBy('location')} />
                                <datalist id={id('towns')}>{MURCIA_TOWNS.map(t => <option key={t} value={t} />)}</datalist>
                            </Field>
                            <Field label="Dirección" htmlFor={id('address')} className="sm:col-span-2">
                                <input id={id('address')} type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass()} placeholder="Calle Mayor, 12" autoComplete="off" />
                            </Field>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPinIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                                    {pin ? `Chincheta en ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'Sin ubicar: haz clic en el mapa o busca la dirección'}
                                </p>
                                <div className="flex gap-2">
                                    {pin && (
                                        <button type="button" onClick={() => setPin(null)} className="text-sm font-medium text-gray-600 hover:underline dark:text-gray-300">Quitar</button>
                                    )}
                                    <button type="button" onClick={locateAddress} disabled={geocoding === 'busy' || (!form.address.trim() && !form.location.trim())}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-300">
                                        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                                        {geocoding === 'busy' ? 'Buscando…' : 'Situar por la dirección'}
                                    </button>
                                </div>
                            </div>
                            {geocoding === 'not-found' && (
                                <p role="status" className="bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">No hemos encontrado esa dirección. Marca el punto en el mapa.</p>
                            )}
                            <div className="h-64">
                                <MapContainer center={[(pin ?? REGION_CENTER).lat, (pin ?? REGION_CENTER).lng]} zoom={pin ? 15 : 9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {pin && <Marker position={[pin.lat, pin.lng]} icon={markerIcon} />}
                                    <LocationPicker onPick={(lat, lng) => { setPin({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }); setGeocoding('idle'); }} />
                                    {pin && <MapRecenter lat={pin.lat} lng={pin.lng} />}
                                </MapContainer>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Descripción">
                        <Field label="Descripción del anuncio" htmlFor={id('description')} error={errors.description} hint={`${form.description.length} caracteres. Cuenta lo que no se ve en las fotos: estado, reformas, barrio…`} required>
                            <textarea id={id('description')} value={form.description} onChange={(e) => set('description', e.target.value)} rows={5}
                                className={inputClass(!!errors.description)} placeholder="Luminoso piso de 3 habitaciones…" aria-invalid={!!errors.description} aria-describedby={describedBy('description')} />
                        </Field>
                    </FormSection>

                    <FormSection title="Fotos" description="La primera es la portada del anuncio. JPG, PNG o WEBP de hasta 5 MB.">
                        <div {...getRootProps()} className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${isDragActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}`}>
                            <input {...getInputProps()} aria-label="Añadir fotos" />
                            <PhotoIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium text-emerald-700 dark:text-emerald-300">Elige fotos</span> o arrástralas aquí
                            </p>
                        </div>
                        {fileErrors.length > 0 && (
                            <ul role="alert" className="space-y-1 text-sm text-red-600 dark:text-red-400">
                                {fileErrors.map(msg => <li key={msg}>{msg}</li>)}
                            </ul>
                        )}
                        {photos.length > 0 && (
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {(coverIsNew ? [...photos.filter(p => p.kind === 'new'), ...photos.filter(p => p.kind === 'existing')] : photos).map((photo, position) => (
                                    <li key={photo.key} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                                        <img src={photo.src} alt={`Foto ${position + 1}`} className="h-full w-full object-cover" />
                                        {position === 0 && (
                                            <span className="absolute left-2 top-2 rounded-md bg-gray-900/75 px-2 py-0.5 text-xs font-medium text-white">Portada</span>
                                        )}
                                        {photo.kind === 'new' && (
                                            <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Nueva</span>
                                        )}
                                        <div className="absolute right-2 top-2 flex gap-1">
                                            {position !== 0 && (
                                                <button type="button" onClick={() => makeCover(photo.kind, photo.index)} title="Usar como portada" aria-label={`Usar la foto ${position + 1} como portada`}
                                                    className="rounded-md bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white">
                                                    <StarIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button type="button" onClick={() => removePhoto(photo.kind, photo.index)} title="Quitar" aria-label={`Quitar la foto ${position + 1}`}
                                                className="rounded-md bg-white/90 p-1.5 text-red-600 shadow hover:bg-white">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FormSection>

                    <FormSection title="Datos económicos" description="Privados: solo los ves tú y el administrador. Sirven para calcular la rentabilidad.">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Precio de compra (€)" htmlFor={id('purchasePrice')} error={errors.purchasePrice}>
                                <input id={id('purchasePrice')} type="number" inputMode="decimal" min="0" step="any" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} className={inputClass(!!errors.purchasePrice)} />
                            </Field>
                            <Field label="Coste total de adquisición (€)" htmlFor={id('totalCost')} error={errors.totalCost} hint="Compra, impuestos, notaría, reformas y comisiones">
                                <input id={id('totalCost')} type="number" inputMode="decimal" min="0" step="any" value={form.totalCost} onChange={(e) => set('totalCost', e.target.value)} className={inputClass(!!errors.totalCost)} />
                            </Field>
                            <Field label="Gastos mensuales (€)" htmlFor={id('monthlyCost')} error={errors.monthlyCost} hint="Comunidad, IBI, seguro y mantenimiento">
                                <input id={id('monthlyCost')} type="number" inputMode="decimal" min="0" step="any" value={form.monthlyCost} onChange={(e) => set('monthlyCost', e.target.value)} className={inputClass(!!errors.monthlyCost)} />
                            </Field>
                            <Field label="Ingresos mensuales (€)" htmlFor={id('monthlyIncome')} error={errors.monthlyIncome} hint="Alquiler que cobras, si está alquilado">
                                <input id={id('monthlyIncome')} type="number" inputMode="decimal" min="0" step="any" value={form.monthlyIncome} onChange={(e) => set('monthlyIncome', e.target.value)} className={inputClass(!!errors.monthlyIncome)} />
                            </Field>
                        </div>
                        {(monthlyCost > 0 || monthlyIncome > 0) && (
                            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900/40">
                                <div>
                                    <dt className="text-gray-500 dark:text-gray-400">Flujo de caja mensual</dt>
                                    <dd className={`font-semibold tabular-nums ${cashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>{cashFlow >= 0 ? '+' : ''}{eur(cashFlow)}</dd>
                                </div>
                                {totalCost > 0 && monthlyIncome > 0 && (
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Rentabilidad neta anual</dt>
                                        <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{((cashFlow * 12 / totalCost) * 100).toFixed(2)} %</dd>
                                    </div>
                                )}
                            </dl>
                        )}
                    </FormSection>
                </form>

                {/* Pie fijo con las acciones */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-h-[1.25rem] text-sm" aria-live="polite">
                        {errors.submit ? (
                            <span className="text-red-600 dark:text-red-400">{errors.submit}</span>
                        ) : errorCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400">Revisa {errorCount === 1 ? 'el campo marcado' : `los ${errorCount} campos marcados`}.</span>
                        ) : null}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={requestClose} disabled={isSubmitting} className={`${buttonClass.secondary} flex-1 sm:flex-none`}>Cancelar</button>
                        <button type="submit" form={id('form')} disabled={isSubmitting} className={`${buttonClass.primary} flex-1 sm:flex-none sm:min-w-[9rem]`}>
                            {isSubmitting ? (newFiles.length > 0 ? 'Subiendo fotos…' : 'Guardando…') : initialData ? 'Guardar cambios' : form.status === 'draft' ? 'Guardar borrador' : 'Publicar inmueble'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default PropertyFormModal;
