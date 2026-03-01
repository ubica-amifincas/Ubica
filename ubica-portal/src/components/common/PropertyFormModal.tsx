import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, MapPinIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { Property } from '../../types';

// Fix Leaflet default marker icon
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map clicks
function LocationPicker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
}

// Component to recenter the map when coordinates change externally
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    const prevRef = useRef({ lat, lng });
    useEffect(() => {
        if (prevRef.current.lat !== lat || prevRef.current.lng !== lng) {
            map.setView([lat, lng], map.getZoom());
            prevRef.current = { lat, lng };
        }
    }, [lat, lng, map]);
    return null;
}

interface PropertyFormData {
    title: string;
    price: number;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    location: string;
    address: string;
    description: string;
    features: string[];
    images: string[];
    yearBuilt: number;
    orientation: string;
    energyRating: string;
    coordinates: { lat: number; lng: number };
    investmentData: { roi: number; rentalYield: number; monthsOnMarket: number };
    // Campos financieros de inversión
    purchasePrice: number;
    totalCost: number;
    monthlyCost: number;
    monthlyIncome: number;
}

const PROPERTY_TYPES = [
    { value: 'villa', label: 'Villa' },
    { value: 'apartamento', label: 'Apartamento' },
    { value: 'piso', label: 'Piso' },
    { value: 'casa', label: 'Casa' },
    { value: 'atico', label: 'Ático' },
    { value: 'chalet', label: 'Chalet' },
    { value: 'estudio', label: 'Estudio' },
    { value: 'terreno', label: 'Terreno' },
];

const PROPERTY_STATUS = [
    { value: 'for-sale', label: 'En Venta' },
    { value: 'for-rent', label: 'En Alquiler' },
    { value: 'sold', label: 'Vendido' },
    { value: 'rented', label: 'Alquilado' },
    { value: 'under-renovation', label: 'En Reforma' },
    { value: 'in-use', label: 'En Uso' },
    { value: 'reserved', label: 'Reservado' },
];

const MURCIA_LOCATIONS = [
    'Cartagena', 'Murcia', 'Lorca', 'Águilas', 'San Pedro del Pinatar',
    'Torre Pacheco', 'Molina de Segura', 'Totana', 'Alcantarilla', 'Cieza'
];

const COMMON_FEATURES = [
    'Piscina privada', 'Jardín', 'Garaje', 'Aire acondicionado', 'Terraza',
    'Balcón', 'Ascensor', 'Trastero', 'Calefacción', 'Parking',
    'Vistas al mar', 'Cerca de la playa', 'Amueblado', 'Cocina equipada'
];

interface PropertyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData?: Property | null;
}

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<PropertyFormData>({
        title: '',
        price: 0,
        type: 'apartamento',
        status: 'for-sale',
        bedrooms: 1,
        bathrooms: 1,
        area: 50,
        location: 'Cartagena',
        address: '',
        description: '',
        features: [],
        images: [],
        yearBuilt: new Date().getFullYear(),
        orientation: 'Sur',
        energyRating: 'A',
        coordinates: { lat: 37.9922, lng: -1.1307 },
        investmentData: { roi: 5, rentalYield: 4, monthsOnMarket: 0 },
        purchasePrice: 0,
        totalCost: 0,
        monthlyCost: 0,
        monthlyIncome: 0,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [featuresInput, setFeaturesInput] = useState('');
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const apiService = useAuthenticatedFetch();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setNewFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
        }
    });

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    title: initialData.title,
                    price: initialData.price,
                    type: initialData.type,
                    status: initialData.status,
                    bedrooms: initialData.bedrooms,
                    bathrooms: initialData.bathrooms,
                    area: initialData.area,
                    location: initialData.location,
                    address: initialData.address || '',
                    description: initialData.description || '',
                    features: initialData.features || [],
                    images: initialData.images || [],
                    yearBuilt: initialData.yearBuilt || new Date().getFullYear(),
                    orientation: initialData.orientation || 'Sur',
                    energyRating: initialData.energyRating || 'A',
                    coordinates: initialData.coordinates || { lat: 37.9922, lng: -1.1307 },
                    investmentData: initialData.investmentData || { roi: 5, rentalYield: 4, monthsOnMarket: 0 },
                    purchasePrice: initialData.purchasePrice || 0,
                    totalCost: initialData.totalCost || 0,
                    monthlyCost: initialData.monthlyCost || 0,
                    monthlyIncome: initialData.monthlyIncome || 0,
                });
                setFeaturesInput((initialData.features || []).join(', '));
                setExistingImages(initialData.images || []);
                setNewFiles([]);
            } else {
                // Reset form
                setFormData({
                    title: '',
                    price: 0,
                    type: 'apartamento',
                    status: 'for-sale',
                    bedrooms: 1,
                    bathrooms: 1,
                    area: 50,
                    location: 'Cartagena',
                    address: '',
                    description: '',
                    features: [],
                    images: [],
                    yearBuilt: new Date().getFullYear(),
                    orientation: 'Sur',
                    energyRating: 'A',
                    coordinates: { lat: 37.9922, lng: -1.1307 },
                    investmentData: { roi: 5, rentalYield: 4, monthsOnMarket: 0 },
                    purchasePrice: 0,
                    totalCost: 0,
                    monthlyCost: 0,
                    monthlyIncome: 0,
                });
                setFeaturesInput('');
                setExistingImages([]);
                setNewFiles([]);
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'El título es requerido';
        if (formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
        if (formData.bedrooms < 0) newErrors.bedrooms = 'Las habitaciones no pueden ser negativas';
        if (formData.bathrooms < 0) newErrors.bathrooms = 'Los baños no pueden ser negativos';
        if (formData.area <= 0) newErrors.area = 'El área debe ser mayor a 0';
        if (!formData.address.trim()) newErrors.address = 'La dirección es requerida';
        if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        const features = featuresInput
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);

        try {
            // Subir nuevas imágenes primero
            let newImageUrls: string[] = [];
            if (newFiles.length > 0) {
                newImageUrls = await apiService.uploadImages(newFiles);
            }

            const finalImages = [...existingImages, ...newImageUrls];

            const propertyData = {
                ...formData,
                features,
                images: finalImages.length > 0 ? finalImages : ['/images/casa-moderna.jpg'],
            };

            if (initialData) {
                await apiService.updateUserProperty(initialData.id, propertyData);
            } else {
                await apiService.createUserProperty(propertyData);
            }

            onSave(); // Trigger parent refresh
            onClose(); // Close modal
        } catch (error: any) {
            setErrors({ submit: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {initialData ? 'Editar Propiedad' : 'Crear Propiedad'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Ej: Villa moderna en Cartagena"
                            />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                        </div>

                        {/* Price and Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (€) *</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="200000"
                                />
                                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {PROPERTY_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status and Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado *</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {PROPERTY_STATUS.map((status) => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación *</label>
                                <select
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {MURCIA_LOCATIONS.map((location) => (
                                        <option key={location} value={location}>{location}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Bedrooms, Bathrooms, Area */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habitaciones *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.bedrooms}
                                    onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.bedrooms && <p className="text-red-500 text-xs mt-1">{errors.bedrooms}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Baños *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.bathrooms}
                                    onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.bathrooms && <p className="text-red-500 text-xs mt-1">{errors.bathrooms}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área (m²) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.area}
                                    onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección *</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Calle Ejemplo, 123, Cartagena"
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Descripción detallada de la propiedad..."
                            />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                        </div>

                        {/* Features */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Características (separadas por comas)</label>
                            <input
                                type="text"
                                value={featuresInput}
                                onChange={(e) => setFeaturesInput(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Piscina privada, Jardín, Garaje, Aire acondicionado"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sugerencias: {COMMON_FEATURES.slice(0, 5).join(', ')}...</p>
                        </div>

                        {/* Images Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Imágenes de la Propiedad
                            </label>

                            <div
                                {...getRootProps()}
                                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragActive
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                    }`}
                            >
                                <div className="space-y-1 text-center cursor-pointer">
                                    <input {...getInputProps()} />
                                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                        <span className="relative rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                            Selecciona archivos
                                        </span>
                                        <p className="pl-1">o arrastra y suelta aquí</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        PNG, JPG, WEBP hasta 5MB
                                    </p>
                                </div>
                            </div>

                            {/* Previews */}
                            {(existingImages.length > 0 || newFiles.length > 0) && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {/* Existing Images */}
                                    {existingImages.map((url, idx) => (
                                        <div key={`existing-${idx}`} className="relative group rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video">
                                            <img src={url} alt={`Imagen ${idx}`} className="object-cover w-full h-full" />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* New Files to upload */}
                                    {newFiles.map((file, idx) => (
                                        <div key={`new-${idx}`} className="relative group rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video ring-2 ring-blue-500/50">
                                            <img src={URL.createObjectURL(file)} alt={`Nueva ${idx}`} className="object-cover w-full h-full opacity-70" />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5 truncate px-1">
                                                {file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewFile(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <hr className="border-gray-300 dark:border-gray-600 my-6" />

                        {/* Additional Properties */}
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Propiedades Adicionales</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Year Built */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año Construcción *</label>
                                <input
                                    type="number"
                                    min="1800"
                                    value={formData.yearBuilt}
                                    onChange={(e) => setFormData({ ...formData, yearBuilt: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Orientation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orientación *</label>
                                <select
                                    value={formData.orientation}
                                    onChange={(e) => setFormData({ ...formData, orientation: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="Norte">Norte</option>
                                    <option value="Sur">Sur</option>
                                    <option value="Este">Este</option>
                                    <option value="Oeste">Oeste</option>
                                    <option value="Noreste">Noreste</option>
                                    <option value="Noroeste">Noroeste</option>
                                    <option value="Sureste">Sureste</option>
                                    <option value="Suroeste">Suroeste</option>
                                </select>
                            </div>

                            {/* Energy Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificación Energética *</label>
                                <select
                                    value={formData.energyRating}
                                    onChange={(e) => setFormData({ ...formData, energyRating: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(rating => (
                                        <option key={rating} value={rating}>{rating}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Coordinates */}
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mt-4 flex items-center gap-2">
                            <MapPinIcon className="h-5 w-5 text-emerald-600" />
                            Coordenadas Mapas
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitud (lat) *</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.coordinates.lat}
                                    onChange={(e) => setFormData({ ...formData, coordinates: { ...formData.coordinates, lat: Number(e.target.value) } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitud (lng) *</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.coordinates.lng}
                                    onChange={(e) => setFormData({ ...formData, coordinates: { ...formData.coordinates, lng: Number(e.target.value) } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Interactive Map Picker */}
                        <div className="mt-2 rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 flex items-center justify-between">
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                    📍 Haz clic en el mapa para colocar la chincheta
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)}
                                </span>
                            </div>
                            <div style={{ height: '250px', width: '100%' }}>
                                <MapContainer
                                    center={[formData.coordinates.lat, formData.coordinates.lng]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker
                                        position={[formData.coordinates.lat, formData.coordinates.lng]}
                                        icon={defaultIcon}
                                    />
                                    <LocationPicker
                                        onLocationSelect={(lat, lng) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                coordinates: {
                                                    lat: parseFloat(lat.toFixed(6)),
                                                    lng: parseFloat(lng.toFixed(6))
                                                }
                                            }));
                                        }}
                                    />
                                    <MapRecenter lat={formData.coordinates.lat} lng={formData.coordinates.lng} />
                                </MapContainer>
                            </div>
                        </div>

                        {/* Investment Data */}
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mt-4">Datos de Inversión</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ROI (%) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.investmentData.roi}
                                    onChange={(e) => setFormData({ ...formData, investmentData: { ...formData.investmentData, roi: Number(e.target.value) } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rentabilidad (%) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.investmentData.rentalYield}
                                    onChange={(e) => setFormData({ ...formData, investmentData: { ...formData.investmentData, rentalYield: Number(e.target.value) } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meses en Mercado *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.investmentData.monthsOnMarket}
                                    onChange={(e) => setFormData({ ...formData, investmentData: { ...formData.investmentData, monthsOnMarket: Number(e.target.value) } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Financial Investment Data */}
                        <hr className="border-gray-300 dark:border-gray-600 my-6" />
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <span>💰</span> Datos Financieros de Inversión
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">
                            Campos clave para calcular la rentabilidad real de la inversión
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio de Compra (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.purchasePrice}
                                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Ej: 150000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Coste Total Adquisición (€)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.totalCost}
                                    onChange={(e) => setFormData({ ...formData, totalCost: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Compra + impuestos + notaría + reformas"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Incluye impuestos, notaría, reformas y comisiones</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Gasto Mensual (€/mes)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formData.monthlyCost}
                                    onChange={(e) => setFormData({ ...formData, monthlyCost: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Comunidad, IBI, seguro..."
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Comunidad + IBI + seguro + mantenimiento</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ingreso Mensual (€/mes)
                                    {formData.status !== 'rented' && (
                                        <span className="ml-2 text-xs text-amber-500">⚠ Solo aplica si está alquilado</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={formData.monthlyIncome}
                                    onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                                    disabled={formData.status !== 'rented'}
                                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${formData.status !== 'rented' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="Alquiler mensual recibido"
                                />
                            </div>
                        </div>

                        {/* Cash Flow Preview */}
                        {(formData.monthlyCost > 0 || formData.monthlyIncome > 0) && (
                            <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Cash Flow Mensual:</span>
                                    <span className={`font-bold ${(formData.monthlyIncome - formData.monthlyCost) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {(formData.monthlyIncome - formData.monthlyCost) >= 0 ? '+' : ''}
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(formData.monthlyIncome - formData.monthlyCost)}
                                    </span>
                                </div>
                                {formData.totalCost > 0 && formData.monthlyIncome > 0 && (
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-gray-600 dark:text-gray-400">ROI Anual Estimado:</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {(((formData.monthlyIncome - formData.monthlyCost) * 12 / formData.totalCost) * 100).toFixed(2)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

                        {/* Buttons */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                ) : (
                                    initialData ? 'Actualizar' : 'Crear'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PropertyFormModal;
