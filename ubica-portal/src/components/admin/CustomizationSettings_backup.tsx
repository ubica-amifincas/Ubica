import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  PhotoIcon,
  PaintBrushIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface CustomizationSettings {
  logo: {
    url: string;
    uploadedFile?: File;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  branding: {
    platformName: string;
    tagline: string;
  };
  footer: {
    text: string;
    socialMedia: {
      facebook: string;
      twitter: string;
      instagram: string;
      linkedin: string;
    };
  };
}

const CustomizationSettingsComponent: React.FC = () => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<CustomizationSettings>({
    logo: {
      url: '/images/atarax-logo.png'
    },
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4'
    },
    branding: {
      platformName: 'Ubica',
      tagline: 'Tu portal inmobiliario de confianza en Murcia'
    },
    footer: {
      text: '© 2024 Ubica. Todos los derechos reservados.',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: ''
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>('');

  useEffect(() => {
    // Cargar configuraciones desde localStorage
    const savedSettings = localStorage.getItem('atarax_customization_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        if (parsed.logo?.url) {
          setPreviewLogo(parsed.logo.url);
        }
      } catch (error) {
        console.error('Error loading customization settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Guardar en localStorage
      localStorage.setItem('atarax_customization_settings', JSON.stringify(settings));
      
      // Aplicar colores CSS personalizados
      applyCustomColors();
      
      setMessage({ type: 'success', text: t('customization.settingsUpdated') });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyCustomColors = () => {
    const root = document.documentElement;
    
    // Convertir hex a RGB para CSS variables
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '37, 99, 235'; // fallback blue
    };

    root.style.setProperty('--color-primary', hexToRgb(settings.colors.primary));
    root.style.setProperty('--color-secondary', hexToRgb(settings.colors.secondary));
    root.style.setProperty('--color-accent', hexToRgb(settings.colors.accent));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select a valid image file' });
        return;
      }

      // Validar tamaño (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 2MB' });
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewLogo(dataUrl);
        setSettings(prev => ({
          ...prev,
          logo: {
            url: dataUrl,
            uploadedFile: file
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (colorType: keyof CustomizationSettings['colors'], value: string) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorType]: value
      }
    }));
  };

  const resetToDefaults = () => {
    setSettings({
      logo: {
        url: '/images/atarax-logo.png'
      },
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#06b6d4'
      },
      branding: {
        platformName: 'Ubica',
        tagline: 'Tu portal inmobiliario de confianza en Murcia'
      },
      footer: {
        text: '© 2024 Ubica. Todos los derechos reservados.',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        }
      }
    });
    setPreviewLogo('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('customization.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('customization.subtitle')}
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('customization.logo')}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Current Logo Preview */}
            <div className="flex justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                {previewLogo || settings.logo.url ? (
                  <img
                    src={previewLogo || settings.logo.url}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzI1NjNlYiIvPgo8dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BPC90ZXh0Pgo8L3N2Zz4K';
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No logo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <CloudArrowUpIcon className="h-4 w-4" />
                <span>{t('customization.uploadLogo')}</span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                PNG, JPG, SVG up to 2MB
              </p>
            </div>
          </div>
        </motion.div>

        {/* Color Scheme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PaintBrushIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('customization.colors')}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.primaryColor')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={settings.colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.secondaryColor')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={settings.colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.accentColor')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={settings.colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
              <div className="flex space-x-2">
                <div 
                  className="w-8 h-8 rounded" 
                  style={{ backgroundColor: settings.colors.primary }}
                  title="Primary"
                ></div>
                <div 
                  className="w-8 h-8 rounded" 
                  style={{ backgroundColor: settings.colors.secondary }}
                  title="Secondary"
                ></div>
                <div 
                  className="w-8 h-8 rounded" 
                  style={{ backgroundColor: settings.colors.accent }}
                  title="Accent"
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <BuildingStorefrontIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('customization.branding')}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.platformName')}
              </label>
              <input
                type="text"
                value={settings.branding.platformName}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  branding: { ...prev.branding, platformName: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.tagline')}
              </label>
              <textarea
                value={settings.branding.tagline}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  branding: { ...prev.branding, tagline: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </motion.div>

        {/* Social Media */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <GlobeAltIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('customization.socialMedia')}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.facebook')}
              </label>
              <input
                type="url"
                value={settings.footer.socialMedia.facebook}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  footer: {
                    ...prev.footer,
                    socialMedia: { ...prev.footer.socialMedia, facebook: e.target.value }
                  }
                }))}
                placeholder="https://facebook.com/your-page"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.instagram')}
              </label>
              <input
                type="url"
                value={settings.footer.socialMedia.instagram}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  footer: {
                    ...prev.footer,
                    socialMedia: { ...prev.footer.socialMedia, instagram: e.target.value }
                  }
                }))}
                placeholder="https://instagram.com/your-account"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customization.linkedin')}
              </label>
              <input
                type="url"
                value={settings.footer.socialMedia.linkedin}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  footer: {
                    ...prev.footer,
                    socialMedia: { ...prev.footer.socialMedia, linkedin: e.target.value }
                  }
                }))}
                placeholder="https://linkedin.com/company/your-company"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('customization.footer')}
        </h3>
        <textarea
          value={settings.footer.text}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            footer: { ...prev.footer, text: e.target.value }
          }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </motion.div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Reset to Defaults
        </button>

        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
            <span>{loading ? t('status.saving') : t('actions.save')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CustomizationSettingsComponent;
