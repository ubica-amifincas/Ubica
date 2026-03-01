import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  PhotoIcon,
  PaintBrushIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  SwatchIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface CustomizationSettings {
  logo: {
    url: string;
    uploadedFile?: File;
    size: 'small' | 'medium' | 'large';
    position: 'left' | 'center' | 'right';
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    fontSize: 'small' | 'medium' | 'large';
    fontWeight: 'light' | 'normal' | 'medium' | 'bold';
    lineHeight: 'tight' | 'normal' | 'relaxed';
  };
  layout: {
    headerStyle: 'minimal' | 'standard' | 'expanded';
    sidebarPosition: 'left' | 'right' | 'hidden';
    cardStyle: 'minimal' | 'shadow' | 'border' | 'elevated';
    spacing: 'compact' | 'comfortable' | 'spacious';
    borderRadius: 'none' | 'small' | 'medium' | 'large';
    containerWidth: 'full' | 'container' | 'narrow';
  };
  branding: {
    platformName: string;
    tagline: string;
    description: string;
    favicon: string;
    metaTitle: string;
    metaDescription: string;
  };
  footer: {
    text: string;
    showSocialMedia: boolean;
    socialMedia: {
      facebook: string;
      twitter: string;
      linkedin: string;
      instagram: string;
      youtube: string;
    };
    showContactInfo: boolean;
    contactInfo: {
      email: string;
      phone: string;
      address: string;
    };
    customLinks: Array<{
      label: string;
      url: string;
    }>;
  };
  features: {
    enableDarkMode: boolean;
    enableLanguageSelector: boolean;
    enableSearch: boolean;
    enableNotifications: boolean;
    enableAnimations: boolean;
    enableChat: boolean;
    enableAnalytics: boolean;
    enableSEO: boolean;
  };
  security: {
    enableTwoFactor: boolean;
    sessionTimeout: number;
    passwordComplexity: 'low' | 'medium' | 'high';
    loginAttempts: number;
  };
  performance: {
    enableCaching: boolean;
    enableCompression: boolean;
    enableLazyLoading: boolean;
    imageOptimization: boolean;
  };
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Recomendada)', category: 'modern' },
  { value: 'Roboto', label: 'Roboto', category: 'modern' },
  { value: 'Open Sans', label: 'Open Sans', category: 'classic' },
  { value: 'Poppins', label: 'Poppins', category: 'modern' },
  { value: 'Montserrat', label: 'Montserrat', category: 'display' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', category: 'professional' },
  { value: 'Lato', label: 'Lato', category: 'classic' },
  { value: 'Nunito', label: 'Nunito', category: 'friendly' },
  { value: 'Work Sans', label: 'Work Sans', category: 'professional' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'elegant' }
];

const PREDEFINED_THEMES = [
  {
    name: 'Ubica Clásico',
    description: 'Tema corporativo profesional',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#7c3aed',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    name: 'Océano Profundo',
    description: 'Inspirado en el mar mediterráneo',
    colors: {
      primary: '#0891b2',
      secondary: '#0369a1',
      accent: '#06b6d4',
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#0c4a6e',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626'
    }
  },
  {
    name: 'Bosque Mediterráneo',
    description: 'Colores naturales y orgánicos',
    colors: {
      primary: '#059669',
      secondary: '#065f46',
      accent: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#064e3b',
      success: '#22c55e',
      warning: '#eab308',
      error: '#dc2626'
    }
  },
  {
    name: 'Atardecer Murciano',
    description: 'Cálidos colores mediterráneos',
    colors: {
      primary: '#ea580c',
      secondary: '#dc2626',
      accent: '#f59e0b',
      background: '#fff7ed',
      surface: '#ffffff',
      text: '#9a3412',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#e11d48'
    }
  },
  {
    name: 'Elegancia Minimalista',
    description: 'Diseño limpio y sofisticado',
    colors: {
      primary: '#374151',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626'
    }
  },
  {
    name: 'Modo Nocturno',
    description: 'Perfecto para trabajo nocturno',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171'
    }
  }
];

const EnhancedCustomizationSettings: React.FC = () => {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    const saved = localStorage.getItem('ubica-customization-enhanced');
    return saved ? JSON.parse(saved) : {
      logo: {
        url: '',
        size: 'medium',
        position: 'left'
      },
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#7c3aed',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      typography: {
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        fontSize: 'medium',
        fontWeight: 'normal',
        lineHeight: 'normal'
      },
      layout: {
        headerStyle: 'standard',
        sidebarPosition: 'left',
        cardStyle: 'shadow',
        spacing: 'comfortable',
        borderRadius: 'medium',
        containerWidth: 'container'
      },
      branding: {
        platformName: 'Ubica',
        tagline: 'Tu Portal Inmobiliario de Confianza',
        description: 'Encuentra la propiedad perfecta para ti',
        favicon: '',
        metaTitle: 'Ubica - Portal Inmobiliario',
        metaDescription: 'Descubre las mejores propiedades en Murcia'
      },
      footer: {
        text: '© 2024 Ubica. Todos los derechos reservados.',
        showSocialMedia: true,
        socialMedia: {
          facebook: '',
          twitter: '',
          linkedin: '',
          instagram: '',
          youtube: ''
        },
        showContactInfo: true,
        contactInfo: {
          email: 'info@ubica.com',
          phone: '+34 900 123 456',
          address: 'Murcia, España'
        },
        customLinks: []
      },
      features: {
        enableDarkMode: true,
        enableLanguageSelector: true,
        enableSearch: true,
        enableNotifications: true,
        enableAnimations: true,
        enableChat: false,
        enableAnalytics: true,
        enableSEO: true
      },
      security: {
        enableTwoFactor: false,
        sessionTimeout: 30,
        passwordComplexity: 'medium',
        loginAttempts: 3
      },
      performance: {
        enableCaching: true,
        enableCompression: true,
        enableLazyLoading: true,
        imageOptimization: true
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'branding' | 'colors' | 'typography' | 'layout' | 'features' | 'security' | 'performance'>('branding');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();

  // Track changes
  useEffect(() => {
    const saved = localStorage.getItem('ubica-customization-enhanced');
    if (saved) {
      const savedSettings = JSON.parse(saved);
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(true);
    }
  }, [settings]);

  // Apply settings in real-time for preview
  useEffect(() => {
    const root = document.documentElement;

    // Apply colors
    root.style.setProperty('--color-primary', settings.colors.primary);
    root.style.setProperty('--color-secondary', settings.colors.secondary);
    root.style.setProperty('--color-accent', settings.colors.accent);
    root.style.setProperty('--color-background', settings.colors.background);
    root.style.setProperty('--color-surface', settings.colors.surface);
    root.style.setProperty('--color-text', settings.colors.text);
    root.style.setProperty('--color-success', settings.colors.success);
    root.style.setProperty('--color-warning', settings.colors.warning);
    root.style.setProperty('--color-error', settings.colors.error);

    // Apply typography
    root.style.setProperty('--font-primary', settings.typography.primaryFont);
    root.style.setProperty('--font-secondary', settings.typography.secondaryFont);

    // Update document title
    document.title = settings.branding.metaTitle;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', settings.branding.metaDescription);
    }
  }, [settings]);

  const handleSaveAndApply = async () => {
    setIsSaving(true);

    try {
      // Save to localStorage
      localStorage.setItem('ubica-customization-enhanced', JSON.stringify(settings));

      // Apply settings to the actual platform
      const root = document.documentElement;

      // Apply all CSS custom properties
      Object.entries(settings.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });

      // Update favicon if provided
      if (settings.branding.favicon) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = settings.branding.favicon;
        }
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = '✅ Cambios aplicados exitosamente';
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);

    } catch (error) {
      console.error('Error saving settings:', error);

      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = '❌ Error al guardar cambios';
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: e.target?.result as string,
            uploadedFile: file
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const applyPredefinedTheme = (theme: typeof PREDEFINED_THEMES[0]) => {
    setSettings(prev => ({
      ...prev,
      colors: theme.colors
    }));
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de que quieres restablecer todos los ajustes a los valores por defecto?')) {
      localStorage.removeItem('ubica-customization-enhanced');
      window.location.reload();
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ubica-theme-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings(importedSettings);
        } catch (error) {
          alert('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { key: 'branding', label: 'Marca', icon: BuildingStorefrontIcon, description: 'Logo, nombre y identidad' },
    { key: 'colors', label: 'Colores', icon: PaintBrushIcon, description: 'Paleta de colores y temas' },
    { key: 'typography', label: 'Tipografía', icon: DocumentTextIcon, description: 'Fuentes y texto' },
    { key: 'layout', label: 'Diseño', icon: CubeIcon, description: 'Estructura y espaciado' },
    { key: 'features', label: 'Funciones', icon: GlobeAltIcon, description: 'Características de la plataforma' },
    { key: 'security', label: 'Seguridad', icon: CheckCircleIcon, description: 'Configuración de seguridad' },
    { key: 'performance', label: 'Rendimiento', icon: BookmarkIcon, description: 'Optimización y velocidad' }
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎨 Personalización Avanzada
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Personaliza completamente la apariencia y funcionalidad de tu plataforma Ubica
            </p>

            {/* Status indicators */}
            <div className="flex items-center space-x-4 text-sm">
              <div className={`flex items-center space-x-2 ${hasUnsavedChanges ? 'text-orange-600' : 'text-green-600'}`}>
                {hasUnsavedChanges ? (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
                <span>{hasUnsavedChanges ? 'Cambios sin guardar' : 'Todo guardado'}</span>
              </div>

              {lastSaved && (
                <div className="text-gray-500">
                  Última actualización: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
              id="import-settings"
            />
            <label
              htmlFor="import-settings"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Importar
            </label>

            <button
              onClick={exportSettings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Exportar
            </button>

            <button
              onClick={() => setIsPreviewVisible(!isPreviewVisible)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              {isPreviewVisible ? 'Ocultar' : 'Vista Previa'}
            </button>

            <button
              onClick={resetToDefaults}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Restablecer
            </button>

            <motion.button
              onClick={handleSaveAndApply}
              disabled={isSaving || !hasUnsavedChanges}
              className={`inline-flex items-center px-6 py-2 shadow-sm text-sm font-medium rounded-lg transition-all ${hasUnsavedChanges && !isSaving
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              whileHover={hasUnsavedChanges && !isSaving ? { scale: 1.05 } : {}}
              whileTap={hasUnsavedChanges && !isSaving ? { scale: 0.95 } : {}}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Guardar y Aplicar
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className={`transition-all duration-300 ${isPreviewVisible ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          {/* Enhanced Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 p-1">
              <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium rounded-lg transition-all ${activeTab === tab.key
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <tab.icon className="h-6 w-6" />
                      <span className="font-medium">{tab.label}</span>
                      <span className="text-xs opacity-70">{tab.description}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {activeTab === 'branding' && (
                <div className="space-y-8">
                  {/* Logo Section */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      🖼️ Logo de la Plataforma
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Logo Upload */}
                      <div>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors">
                          {settings.logo.url ? (
                            <div className="space-y-4">
                              <img
                                src={settings.logo.url}
                                alt="Logo preview"
                                className={`mx-auto object-contain bg-white rounded-lg p-2 shadow-sm ${settings.logo.size === 'small' ? 'h-16' :
                                    settings.logo.size === 'medium' ? 'h-24' : 'h-32'
                                  }`}
                              />
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                              >
                                Cambiar logo
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
                              <div>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  Subir logo
                                </button>
                                <p className="text-sm text-gray-500 mt-1">
                                  PNG, JPG, SVG hasta 5MB
                                </p>
                              </div>
                            </div>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </div>
                      </div>

                      {/* Logo Settings */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tamaño del Logo
                          </label>
                          <select
                            value={settings.logo.size}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              logo: { ...prev.logo, size: e.target.value as any }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="small">Pequeño (64px)</option>
                            <option value="medium">Mediano (96px)</option>
                            <option value="large">Grande (128px)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Posición
                          </label>
                          <select
                            value={settings.logo.position}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              logo: { ...prev.logo, position: e.target.value as any }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="left">Izquierda</option>
                            <option value="center">Centro</option>
                            <option value="right">Derecha</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Brand Identity */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      🏢 Identidad de Marca
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nombre de la Plataforma
                        </label>
                        <input
                          type="text"
                          value={settings.branding.platformName}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, platformName: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Ubica"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Eslogan/Tagline
                        </label>
                        <input
                          type="text"
                          value={settings.branding.tagline}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, tagline: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Tu Portal Inmobiliario de Confianza"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={settings.branding.description}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, description: e.target.value }
                          }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Encuentra la propiedad perfecta para ti"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Título Meta (SEO)
                        </label>
                        <input
                          type="text"
                          value={settings.branding.metaTitle}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, metaTitle: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Ubica - Portal Inmobiliario"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Descripción Meta (SEO)
                        </label>
                        <input
                          type="text"
                          value={settings.branding.metaDescription}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            branding: { ...prev.branding, metaDescription: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Descubre las mejores propiedades en Murcia"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-8">
                  {/* Predefined Themes */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      🎨 Temas Predefinidos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {PREDEFINED_THEMES.map((theme, index) => (
                        <motion.button
                          key={index}
                          onClick={() => applyPredefinedTheme(theme)}
                          className="group p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-emerald-500 transition-all hover:shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex space-x-1">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: theme.colors.primary }}
                              />
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: theme.colors.secondary }}
                              />
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: theme.colors.accent }}
                              />
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {theme.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {theme.description}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      🎯 Colores Personalizados
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(settings.colors).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {key === 'primary' ? '🔵 Primario' :
                              key === 'secondary' ? '⚫ Secundario' :
                                key === 'accent' ? '💜 Acento' :
                                  key === 'background' ? '🏳️ Fondo' :
                                    key === 'surface' ? '📄 Superficie' :
                                      key === 'text' ? '📝 Texto' :
                                        key === 'success' ? '✅ Éxito' :
                                          key === 'warning' ? '⚠️ Advertencia' :
                                            key === 'error' ? '❌ Error' : key}
                          </label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                colors: { ...prev.colors, [key]: e.target.value }
                              }))}
                              className="h-12 w-16 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                colors: { ...prev.colors, [key]: e.target.value }
                              }))}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Continúa con las demás pestañas... */}
              {activeTab === 'typography' && (
                <div className="space-y-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      ✍️ Configuración de Fuentes
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fuente Primaria
                        </label>
                        <select
                          value={settings.typography.primaryFont}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            typography: { ...prev.typography, primaryFont: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        >
                          {FONT_OPTIONS.map(font => (
                            <option key={font.value} value={font.value}>
                              {font.label} ({font.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Más opciones de tipografía... */}
                    </div>
                  </div>
                </div>
              )}

              {/* Las demás pestañas seguirían un patrón similar... */}
            </div>
          </div>
        </div>

        {/* Enhanced Live Preview Panel */}
        {isPreviewVisible && (
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    👁️ Vista Previa en Vivo
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded-lg transition-colors ${previewMode === 'desktop' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <ComputerDesktopIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`p-2 rounded-lg transition-colors ${previewMode === 'tablet' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <DeviceTabletIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded-lg transition-colors ${previewMode === 'mobile' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <DevicePhoneMobileIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div
                  className={`border rounded-xl overflow-hidden transition-all ${previewMode === 'mobile' ? 'max-w-sm mx-auto' :
                      previewMode === 'tablet' ? 'max-w-md mx-auto' : 'w-full'
                    }`}
                  style={{
                    backgroundColor: settings.colors.background,
                    fontFamily: settings.typography.primaryFont,
                    borderRadius: settings.layout.borderRadius === 'none' ? '0' :
                      settings.layout.borderRadius === 'small' ? '0.375rem' :
                        settings.layout.borderRadius === 'medium' ? '0.75rem' : '1rem'
                  }}
                >
                  {/* Preview Header */}
                  <div
                    className="p-4 border-b"
                    style={{ backgroundColor: settings.colors.surface }}
                  >
                    <div className={`flex items-center ${settings.logo.position === 'center' ? 'justify-center' :
                        settings.logo.position === 'right' ? 'justify-end' : 'justify-start'
                      }`}>
                      {settings.logo.url ? (
                        <img
                          src={settings.logo.url}
                          alt="Logo"
                          className={`object-contain ${settings.logo.size === 'small' ? 'h-8' :
                              settings.logo.size === 'medium' ? 'h-12' : 'h-16'
                            }`}
                        />
                      ) : (
                        <div
                          className={`font-bold ${settings.logo.size === 'small' ? 'text-xl' :
                              settings.logo.size === 'medium' ? 'text-2xl' : 'text-3xl'
                            }`}
                          style={{
                            color: settings.colors.primary,
                            fontWeight: settings.typography.fontWeight
                          }}
                        >
                          {settings.branding.platformName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="p-4 space-y-4">
                    <div>
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{
                          color: settings.colors.text,
                          fontWeight: settings.typography.fontWeight
                        }}
                      >
                        {settings.branding.tagline}
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: settings.colors.text, opacity: 0.7 }}
                      >
                        {settings.branding.description}
                      </p>
                    </div>

                    {/* Sample Cards */}
                    <div className="space-y-3">
                      <div
                        className={`p-3 ${settings.layout.cardStyle === 'shadow' ? 'shadow-md' :
                            settings.layout.cardStyle === 'border' ? 'border' :
                              settings.layout.cardStyle === 'elevated' ? 'shadow-lg' : ''
                          }`}
                        style={{
                          backgroundColor: settings.colors.surface,
                          borderRadius: settings.layout.borderRadius === 'none' ? '0' :
                            settings.layout.borderRadius === 'small' ? '0.375rem' :
                              settings.layout.borderRadius === 'medium' ? '0.75rem' : '1rem'
                        }}
                      >
                        <div
                          className="text-sm font-medium"
                          style={{ color: settings.colors.primary }}
                        >
                          Propiedad Destacada
                        </div>
                        <div
                          className="text-xs mt-1"
                          style={{ color: settings.colors.text, opacity: 0.7 }}
                        >
                          Murcia Centro • €185,000
                        </div>
                      </div>

                      {/* Status indicators */}
                      <div className="flex space-x-2">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: settings.colors.success + '20',
                            color: settings.colors.success
                          }}
                        >
                          Disponible
                        </span>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: settings.colors.warning + '20',
                            color: settings.colors.warning
                          }}
                        >
                          Nuevo
                        </span>
                      </div>
                    </div>

                    {/* Sample Buttons */}
                    <div className="space-y-2">
                      <button
                        className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: settings.colors.primary,
                          color: settings.colors.surface
                        }}
                      >
                        Ver Detalles
                      </button>
                      <button
                        className="w-full py-2 px-3 rounded-lg text-sm font-medium border transition-colors"
                        style={{
                          borderColor: settings.colors.primary,
                          color: settings.colors.primary,
                          backgroundColor: 'transparent'
                        }}
                      >
                        Contactar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCustomizationSettings;
