/**
 * Configuración global del frontend.
 * Única fuente de la URL base del backend (termina en /api).
 */

const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isProdHost = host.includes('amifincas.es') || host.includes('vercel.app');

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (isProdHost ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api');
