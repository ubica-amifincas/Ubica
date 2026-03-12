import { apiService } from './apiService';
import { mockApiService } from './mockApiService';

// Tipos comunes exportados para no romper los imports en componentes
export type { User, LoginRequest, LoginResponse } from './apiService';
export type { Property } from '../types';

// Detectar qué servicio usar basándonos en la variable de entorno
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

const isProdContainer = window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app');
const defaultApiUrl = isProdContainer ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || defaultApiUrl;

if (useMockApi) {
    console.log('🚀 Usando Mock API Service (Datos locales)');
} else {
    console.log(`🔌 Conectando al Backend Real en: ${API_BASE_URL}`);
}

// Exportamos el servicio actual enmascarado bajo un nombre común (appService o simplemente lo reexportamos)
export const appService = useMockApi ? mockApiService : apiService;

export default appService;
