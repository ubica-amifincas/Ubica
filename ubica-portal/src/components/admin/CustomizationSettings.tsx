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
  ArrowPathIcon
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
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    fontSize: 'small' | 'medium' | 'large';
    fontWeight: 'light' | 'normal' | 'medium' | 'bold';
  };
  layout: {
    headerStyle: 'minimal' | 'standard' | 'expanded';
    sidebarPosition: 'left' | 'right' | 'hidden';
    cardStyle: 'minimal' | 'shadow' | 'border' | 'elevated';
    spacing: 'compact' | 'comfortable' | 'spacious';
  };
  branding: {
    platformName: string;
    tagline: string;
    description: string;
    favicon: string;
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
  };
  features: {
    enableDarkMode: boolean;
    enableLanguageSelector: boolean;
    enableSearch: boolean;
    enableNotifications: boolean;
    enableAnimations: boolean;
  };
  responsive: {
    mobile: {
      enabled: boolean;
      hideElements: string[];
    };
    tablet: {
      enabled: boolean;
      sidebarCollapse: boolean;
    };
    desktop: {
      maxWidth: 'full' | 'container' | 'narrow';
    };
  };
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Recomendada)', preview: 'font-inter' },
  { value: 'Roboto', label: 'Roboto', preview: 'font-roboto' },
  { value: 'Open Sans', label: 'Open Sans', preview: 'font-opensans' },
  { value: 'Poppins', label: 'Poppins', preview: 'font-poppins' },
  { value: 'Montserrat', label: 'Montserrat', preview: 'font-montserrat' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', preview: 'font-sourcesans' },
  { value: 'Lato', label: 'Lato', preview: 'font-lato' },
  { value: 'Nunito', label: 'Nunito', preview: 'font-nunito' }
];

const PREDEFINED_THEMES = [
  {
    name: 'Ubica Clásico',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#7c3aed',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b'
    }
  },
  {
    name: 'Océano',
    colors: {
      primary: '#0891b2',
      secondary: '#0369a1',
      accent: '#06b6d4',
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#0c4a6e'
    }
  },
  {
    name: 'Bosque',
    colors: {
      primary: '#059669',
      secondary: '#065f46',
      accent: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#064e3b'
    }
  }
];

const CustomizationSettings: React.FC = () => {
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
        text: '#1e293b'
      },
      typography: {
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        fontSize: 'medium',
        fontWeight: 'normal'
      },
      layout: {
        headerStyle: 'standard',
        sidebarPosition: 'left',
        cardStyle: 'shadow',
        spacing: 'comfortable'
      },
      branding: {
        platformName: 'Ubica',
        tagline: 'Tu Portal Inmobiliario de Confianza',
        description: 'Encuentra la propiedad perfecta para ti',
        favicon: ''
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
        }
      },
      features: {
        enableDarkMode: true,
        enableLanguageSelector: true,
        enableSearch: true,
        enableNotifications: true,
        enableAnimations: true
      },
      responsive: {
        mobile: {
          enabled: true,
          hideElements: []
        },
        tablet: {
          enabled: true,
          sidebarCollapse: true
        },
        desktop: {
          maxWidth: 'container'
        }
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'branding' | 'colors' | 'typography' | 'layout' | 'features' | 'responsive'>('branding');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ubica-customization-enhanced', JSON.stringify(settings));
    
    // Apply CSS custom properties for real-time preview
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.colors.primary);
    root.style.setProperty('--color-secondary', settings.colors.secondary);
    root.style.setProperty('--color-accent', settings.colors.accent);
    root.style.setProperty('--color-background', settings.colors.background);
    root.style.setProperty('--color-surface', settings.colors.surface);
    root.style.setProperty('--color-text', settings.colors.text);
    
    // Apply font family
    root.style.setProperty('--font-primary', settings.typography.primaryFont);
    root.style.setProperty('--font-secondary', settings.typography.secondaryFont);
  }, [settings]);

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
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ubica-customization-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key: 'branding', label: 'Marca', icon: BuildingStorefrontIcon },
    { key: 'colors', label: 'Colores', icon: PaintBrushIcon },
    { key: 'typography', label: 'Tipografía', icon: DocumentTextIcon },
    { key: 'layout', label: 'Diseño', icon: CubeIcon },
    { key: 'features', label: 'Funciones', icon: GlobeAltIcon },
    { key: 'responsive', label: 'Responsive', icon: DevicePhoneMobileIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.customization.title') || 'Personalización Avanzada'}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Personaliza completamente la apariencia y funcionalidad de la plataforma
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {isPreviewVisible ? 'Ocultar' : 'Vista Previa'}
          </button>
          <button
            onClick={exportSettings}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Restablecer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Logo de la Plataforma
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
                      <div className="space-y-1 text-center">
                        {settings.logo.url ? (
                          <div className="mb-4">
                            <img
                              src={settings.logo.url}
                              alt="Logo preview"
                              className={`mx-auto object-contain ${
                                settings.logo.size === 'small' ? 'h-12' :
                                settings.logo.size === 'medium' ? 'h-16' : 'h-20'
                              }`}
                            />
                          </div>
                        ) : (
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Subir un archivo</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </label>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF hasta 10MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Platform Branding */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de la Plataforma
                      </label>
                      <input
                        type="text"
                        value={settings.branding.platformName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          branding: { ...prev.branding, platformName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Ubica"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Eslogan/Tagline
                      </label>
                      <input
                        type="text"
                        value={settings.branding.tagline}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          branding: { ...prev.branding, tagline: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Tu Portal Inmobiliario de Confianza"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={settings.branding.description}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          branding: { ...prev.branding, description: e.target.value }
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Encuentra la propiedad perfecta para ti"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="space-y-6">
                  {/* Predefined Themes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Temas Predefinidos
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PREDEFINED_THEMES.map((theme, index) => (
                        <button
                          key={index}
                          onClick={() => applyPredefinedTheme(theme)}
                          className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
                        >
                          <div className="flex items-center space-x-2 mb-2">
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
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {theme.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(settings.colors).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                          {key === 'primary' ? 'Primario' :
                           key === 'secondary' ? 'Secundario' :
                           key === 'accent' ? 'Acento' :
                           key === 'background' ? 'Fondo' :
                           key === 'surface' ? 'Superficie' :
                           key === 'text' ? 'Texto' : key}
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              colors: { ...prev.colors, [key]: e.target.value }
                            }))}
                            className="h-10 w-16 rounded border border-gray-300 dark:border-gray-600"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              colors: { ...prev.colors, [key]: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'typography' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fuente Primaria
                      </label>
                      <select
                        value={settings.typography.primaryFont}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, primaryFont: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value}>{font.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fuente Secundaria
                      </label>
                      <select
                        value={settings.typography.secondaryFont}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, secondaryFont: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value}>{font.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Other tabs would continue here with similar simplified structure */}
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        {isPreviewVisible && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Vista Previa</h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded ${
                        previewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ComputerDesktopIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`p-2 rounded ${
                        previewMode === 'tablet' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <DeviceTabletIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded ${
                        previewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <DevicePhoneMobileIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div 
                  className={`border rounded-lg overflow-hidden ${
                    previewMode === 'mobile' ? 'max-w-sm mx-auto' :
                    previewMode === 'tablet' ? 'max-w-md mx-auto' : 'w-full'
                  }`}
                  style={{
                    backgroundColor: settings.colors.background,
                    fontFamily: settings.typography.primaryFont
                  }}
                >
                  {/* Preview Header */}
                  <div 
                    className="p-3 border-b"
                    style={{ backgroundColor: settings.colors.surface }}
                  >
                    <div className={`flex items-center ${
                      settings.logo.position === 'center' ? 'justify-center' :
                      settings.logo.position === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                      {settings.logo.url ? (
                        <img
                          src={settings.logo.url}
                          alt="Logo"
                          className={`object-contain ${
                            settings.logo.size === 'small' ? 'h-6' :
                            settings.logo.size === 'medium' ? 'h-8' : 'h-10'
                          }`}
                        />
                      ) : (
                        <div 
                          className={`font-bold ${
                            settings.logo.size === 'small' ? 'text-lg' :
                            settings.logo.size === 'medium' ? 'text-xl' : 'text-2xl'
                          }`}
                          style={{ color: settings.colors.primary }}
                        >
                          {settings.branding.platformName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview Content */}
                  <div className="p-3 space-y-3">
                    <div>
                      <h3 
                        className="text-lg font-semibold" 
                        style={{ 
                          color: settings.colors.text,
                          fontWeight: settings.typography.fontWeight
                        }}
                      >
                        {settings.branding.tagline}
                      </h3>
                      <p 
                        className="text-sm mt-1" 
                        style={{ color: settings.colors.text, opacity: 0.7 }}
                      >
                        {settings.branding.description}
                      </p>
                    </div>
                    
                    {/* Sample Card */}
                    <div 
                      className="p-3 rounded shadow-md"
                      style={{ backgroundColor: settings.colors.surface }}
                    >
                      <div 
                        className="text-sm font-medium"
                        style={{ color: settings.colors.primary }}
                      >
                        Propiedad de Ejemplo
                      </div>
                      <div 
                        className="text-xs mt-1"
                        style={{ color: settings.colors.text, opacity: 0.7 }}
                      >
                        Murcia Centro • €185,000
                      </div>
                    </div>
                    
                    {/* Sample Button */}
                    <button 
                      className="w-full py-2 px-3 rounded text-sm font-medium"
                      style={{ 
                        backgroundColor: settings.colors.primary, 
                        color: settings.colors.surface 
                      }}
                    >
                      Ver Detalles
                    </button>
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

export default CustomizationSettings;
