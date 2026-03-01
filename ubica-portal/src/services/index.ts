import { apiService } from './apiService';
import { mockApiService } from './mockApiService';

// Tipos comunes exportados para no romper los imports en componentes
export type { User, LoginRequest, LoginResponse } from './apiService';
export type { Property } from '../types';

// Detectar qué servicio usar basándonos en la variable de entorno
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

if (useMockApi) {
    console.log('🚀 Usando Mock API Service (Datos locales)');
} else {
    console.log(`🔌 Conectando al Backend Real en: ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}`);
}

// Exportamos el servicio actual enmascarado bajo un nombre común (appService o simplemente lo reexportamos)
export const appService = useMockApi ? mockApiService : apiService;

export default appService;
