/**
 * Ubica API Service
 * Cliente HTTP del backend real (FastAPI)
 * AMI Fincas
 */

import { API_BASE_URL } from '../config';
import { getToken, clearSession } from './session';

const FIELD_LABELS: Record<string, string> = {
  email: 'Email', password: 'Contraseña', full_name: 'Nombre', role: 'Rol', message: 'Mensaje',
  price: 'Precio', title: 'Título', is_active: 'Estado',
};

// FastAPI devuelve los errores de validación (422) como una lista de objetos, no como texto
export function formatApiError(errorData: any, status: number): string {
  const detail = errorData?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const field = Array.isArray(d.loc) ? String(d.loc[d.loc.length - 1]) : '';
      const label = FIELD_LABELS[field] || field;
      let msg = d.msg;
      if (d.type === 'missing') msg = 'es obligatorio';
      else if (d.type === 'string_too_short') msg = `debe tener al menos ${d.ctx?.min_length} caracteres`;
      else if (d.type === 'string_too_long') msg = `no puede superar ${d.ctx?.max_length} caracteres`;
      else if (field === 'email') msg = 'no es una dirección válida';
      return label ? `${label}: ${msg}` : msg;
    }).join('. ');
  }
  return errorData?.error || `Error ${status} en el servidor`;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Datos de un anuncio sacados del mensaje del vendedor (null = no aparece en el mensaje). */
export interface ListingDraft {
  operation: 'sale' | 'rent' | null;
  type: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  city: string | null;
  address: string | null;
  features: string[];
  title: string | null;
  description: string | null;
  /** "ai" si lo ha leído la IA; "basic" si no había IA y solo se sacaron los números */
  source: 'ai' | 'basic';
}

/** Correo de Google sin cuenta: falta elegir el tipo de cuenta y aceptar las condiciones. */
export interface GoogleSignupRequired {
  needs_signup: true;
  email: string;
  full_name?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  company?: string;
  phone?: string;
  is_active: boolean;
  is_verified?: boolean;
  /** Inmobiliarias dadas de alta solas: false hasta que el admin las aprueba */
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
}

import type { Property } from '../types';

export type UserRole = 'admin' | 'realtor' | 'investor' | 'user';

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  company?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  role?: UserRole;
  company?: string;
  phone?: string;
  is_active?: boolean;
  is_approved?: boolean;
}

export interface AdminDashboardStats {
  total_properties: number;
  total_users: number;
  total_transactions: number;
  total_revenue: number;
  properties_sold_this_month?: number;
  properties_rented_this_month?: number;
  average_roi?: number;
  market_growth?: number;
  users_by_role?: Partial<Record<UserRole, number>>;
  properties_by_status?: Record<string, number>;
  pending_realtors?: number;
  [key: string]: unknown;
}

// Ubica Play
export interface TasadorRound {
  tipo: 'inmueble' | 'municipio';
  pregunta: string;
  unidad: '€' | '€/m²';
  // inmueble
  inmueble_id?: number;
  titulo?: string;
  tipo_inmueble?: string;
  ciudad?: string | null;
  habitaciones?: number | null;
  banos?: number | null;
  superficie_m2?: number | null;
  fotos?: string[];
  // municipio
  municipio?: string;
  provincia?: string;
  fuente?: string;
}

export interface TasadorReveal {
  real: number;
  respuesta: number;
  error_porcentaje: number;
  puntos: number;
  url?: string;
  ya_respondida?: boolean;
}

export interface TasadorDaily {
  day: string;
  numero: number;
  rondas: TasadorRound[];
  respondidas: (TasadorReveal & { round: number })[];
  segundos_para_el_siguiente: number;
}

export interface TasadorRankingEntry {
  posicion: number;
  nombre: string;
  puntos: number;
  retos: number;
}

export interface GameLeaderboardEntry {
  id: number;
  user_id: number;
  user_name: string;
  game_name: string;
  score: number;
  created_at: string;
}

// Mi cartera inmobiliaria
export interface PortfolioPropertyInput {
  name: string;
  address?: string | null;
  municipio?: string | null;
  provincia?: string | null;
  area_m2?: number | null;
  purchase_price: number;
  purchase_date?: string | null;
  purchase_costs?: number;
  current_value_manual?: number | null;
  mortgage_pending?: number;
  mortgage_monthly?: number;
  rent_monthly?: number;
  community_monthly?: number;
  ibi_yearly?: number;
  insurance_yearly?: number;
  other_yearly?: number;
  notes?: string | null;
}

export interface PortfolioCalc {
  valor: number;
  metodo: 'indice' | 'm2' | 'manual' | 'compra';
  valor_m2_zona: number | null;
  invertido: number;
  plusvalia: number;
  plusvalia_porcentaje: number;
  patrimonio_neto: number;
  ingresos_anuales: number;
  gastos_anuales: number;
  rentabilidad_bruta: number | null;
  rentabilidad_neta: number | null;
  flujo_caja_mensual: number;
}

export interface PortfolioProperty extends PortfolioPropertyInput {
  id: number;
  calculo: PortfolioCalc;
}

export interface PortfolioItem {
  id?: number;
  kind: 'asset' | 'liability';
  name: string;
  description?: string | null;
  amount: number;
}

export interface Portfolio {
  viviendas: PortfolioProperty[];
  otros: PortfolioItem[];
  resumen: {
    valor_inmuebles: number;
    hipotecas: number;
    otros_bienes: number;
    otras_deudas: number;
    patrimonio_neto: number;
    plusvalia: number;
    ingresos_anuales: number;
    flujo_caja_mensual: number;
    rentabilidad_bruta: number | null;
    rentabilidad_neta: number | null;
  };
  evolucion: { trimestre: string; valor: number }[];
  datos_oficiales: { fuente: string; ultimo_trimestre: string };
}

export interface MunicipioOption {
  municipio: string;
  provincia: string;
  eur_m2: number | null;
}

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  /** Web de origen: los presupuestos de AMI Fincas llegan marcados en el asunto. */
  source?: 'ubica' | 'ami';
}

/** Publicación del vídeo de un inmueble en el Instagram de AMI Fincas. */
export interface InstagramPost {
  id: number;
  status: 'publishing' | 'published' | 'error';
  permalink?: string | null;
  error?: string | null;
  created_at: string;
  published_at?: string | null;
}

export interface InstagramStatus {
  /** La cuenta está conectada (hay token en el servidor) */
  configured: boolean;
  /** En venta o en alquiler */
  publishable: boolean;
  video: 'ready' | 'missing' | 'outdated';
  /** Texto propuesto a partir de los datos del anuncio */
  caption: string;
  post: InstagramPost | null;
}

/** Error de la API con el código HTTP, para distinguir p. ej. 429 (demasiados intentos). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface HandleOptions {
  /** No tratar un 401 como sesión caducada (p. ej. el propio login o la validación inicial). */
  skipAuthRedirect?: boolean;
}

/** Limpia la sesión y manda al login avisando de que ha caducado. */
function handleExpiredSession() {
  clearSession();
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;
  window.location.assign('/login?expired=1');
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // No se filtran rutas que no existan: el formulario de edición devuelve esta lista al guardar,
  // así que quitar una aquí la borraría de la base de datos. Las tarjetas ocultan las que no cargan.
  private isImageValid(img: string): boolean {
    return typeof img === 'string' && img.trim() !== '';
  }

  private async handleResponse<T>(response: Response, options: HandleOptions = {}): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && !options.skipAuthRedirect && getToken()) {
        handleExpiredSession();
        throw new ApiError('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401);
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = formatApiError(errorData, response.status);
      console.error('API Error:', errorMessage, 'at', response.url);
      throw new ApiError(errorMessage, response.status);
    }
    if (response.status === 204) return undefined as T;
    return response.json().catch(() => undefined) as Promise<T>;
  }

  // Mapear datos del backend (snake_case y coords planas) al frontend (camelCase y coords anidadas)
  private mapProperty(data: any): Property {
    const rawImages = Array.isArray(data.images) ? data.images : (typeof data.images === 'string' ? JSON.parse(data.images || '[]') : []);
    const validImages = rawImages.filter((img: string) => this.isImageValid(img));

    return {
      ...data,
      images: validImages,
      location: data.location || data.city || '',
      description: data.description || '',
      coordinates: {
        lat: data.latitude || 37.9922,
        lng: data.longitude || -1.1307
      },
      yearBuilt: data.year_built || data.yearBuilt,
      energyRating: data.energy_rating || data.energyRating,
      type: data.type || 'house',
      status: data.status || 'for-sale',
      // Campos financieros de inversión: solo llegan al propietario y al admin;
      // en los listados públicos quedan sin definir
      purchasePrice: data.purchase_price ?? data.purchasePrice ?? undefined,
      totalCost: data.total_cost ?? data.totalCost ?? undefined,
      monthlyCost: data.monthly_cost ?? data.monthlyCost ?? undefined,
      monthlyIncome: data.monthly_income ?? data.monthlyIncome ?? undefined,
      pendingStatus: data.pending_status ?? undefined,
      reviewNote: data.review_note ?? undefined,
    } as Property;
  }

  // Autenticación
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return this.handleResponse<LoginResponse>(response, { skipAuthRedirect: true });
  }

  /** Client ID público de Google; null si el acceso con Google no está activado. */
  async getGoogleConfig(): Promise<{ client_id: string | null }> {
    const response = await fetch(`${API_BASE_URL}/auth/google/config`);
    return this.handleResponse<{ client_id: string | null }>(response, { skipAuthRedirect: true });
  }

  /** Entra (o crea la cuenta) con el ID token que devuelve el botón de Google. */
  /**
   * Entrar con Google. Si el correo no tiene cuenta, el backend no crea nada y responde needs_signup:
   * hay que volver a llamar con el tipo de cuenta y la aceptación de las condiciones.
   */
  async loginWithGoogle(credential: string, signup?: { role: string; acceptTerms: boolean }): Promise<LoginResponse | GoogleSignupRequired> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signup ? { credential, role: signup.role, accept_terms: signup.acceptTerms } : { credential }),
    });
    return this.handleResponse<LoginResponse | GoogleSignupRequired>(response, { skipAuthRedirect: true });
  }

  async register(userData: any): Promise<{ message: string; user_id: number }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return this.handleResponse<{ message: string; user_id: number }>(response);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    return this.handleResponse<{ message: string }>(response);
  }

  /** Devuelve el usuario del token actual. `silent` evita la redirección por sesión caducada. */
  async getCurrentUser(silent = false): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<User>(response, { skipAuthRedirect: silent });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return this.handleResponse<LoginResponse>(response);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse<{ message: string }>(response, { skipAuthRedirect: true });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return this.handleResponse<{ message: string }>(response, { skipAuthRedirect: true });
  }

  async changeEmail(newEmail: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/change-email`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ new_email: newEmail, password }),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async confirmEmailChange(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/confirm-email-change?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
    return this.handleResponse<{ message: string }>(response, { skipAuthRedirect: true });
  }

  // Contacto
  async sendContact(data: ContactRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string }>(response, { skipAuthRedirect: true });
  }

  /** Solo el equipo de AMI Fincas: al resto la API responde 403. */
  async getInstagramStatus(propertyId: number): Promise<InstagramStatus> {
    const response = await fetch(`${API_BASE_URL}/social/instagram/${propertyId}`, { headers: this.getAuthHeaders() });
    return this.handleResponse<InstagramStatus>(response);
  }

  async publishInstagram(propertyId: number, caption: string): Promise<InstagramPost> {
    const response = await fetch(`${API_BASE_URL}/social/instagram/${propertyId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ caption }),
    });
    return this.handleResponse<InstagramPost>(response);
  }

  // Propiedades públicas
  async getProperties(skip = 0, limit = 20): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/properties?skip=${skip}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response);
    return data.map(p => this.mapProperty(p));
  }

  async getProperty(id: number): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any>(response);
    return this.mapProperty(data);
  }

  async getMarketStats(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/stats/market`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Admin endpoints
  async getAdminDashboard(): Promise<AdminDashboardStats> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<AdminDashboardStats>(response);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<User[]>(response);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse<User>(response);
  }

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse<User>(response);
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  async getAllPropertiesAdmin(): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/admin/properties`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response);
    return data.map(p => this.mapProperty(p));
  }

  async getAllPropertiesDashboard(): Promise<Property[]> {
    return this.getUserProperties();
  }

  async deleteProperty(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/properties/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  async createProperty(propertyData: any): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/admin/properties`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    const data = await this.handleResponse<any>(response);
    return this.mapProperty(data);
  }

  async updateProperty(id: number, propertyData: any): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/admin/properties/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    const data = await this.handleResponse<any>(response);
    return this.mapProperty(data);
  }

  // File Upload
  async uploadImages(files: File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];
    // El servidor acepta como mucho 20 por envío: de 10 en 10
    if (files.length > 10) {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i += 10) urls.push(...await this.uploadImages(files.slice(i, i + 10)));
      return urls;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    // Don't use standard getAuthHeaders() because we must let the browser set the boundary for multipart/form-data
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload-images`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await this.handleResponse<{ urls: string[] }>(response);
    return data.urls;
  }

  // Property Import
  async importProperties(formData: FormData): Promise<any> {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/admin/properties/import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<any>(response);
  }

  // User property endpoints — cada usuario gestiona sus propiedades
  async getUserProperties(): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/user/properties`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response);
    return data.map(p => this.mapProperty(p));
  }

  /** Rellena un anuncio a partir del mensaje del vendedor (cuenta para el límite diario de IA). */
  async draftListing(text: string): Promise<ListingDraft> {
    const response = await fetch(`${API_BASE_URL}/ai/listing-draft`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    return this.handleResponse<ListingDraft>(response);
  }

  async createUserProperty(propertyData: any): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/user/properties`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    const data = await this.handleResponse<any>(response);
    return this.mapProperty(data);
  }

  async updateUserProperty(id: number, propertyData: any): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/user/properties/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(propertyData),
    });
    const data = await this.handleResponse<any>(response);
    return this.mapProperty(data);
  }

  async deleteUserProperty(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user/properties/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  // Realtor endpoints
  async getRealtorDashboard(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/realtor/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  /** Inmuebles que gestiona la cuenta: los suyos y, si es inmobiliaria, también los que le asignó el admin. */
  async getManagedProperties(role?: string): Promise<Property[]> {
    const own = await this.getUserProperties();
    if (role !== 'realtor') return own;
    const byId = new Map(own.map(p => [p.id, p]));
    (await this.getRealtorProperties()).forEach(p => { if (!byId.has(p.id)) byId.set(p.id, p); });
    return [...byId.values()];
  }

  async getRealtorProperties(): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/realtor/properties`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response);
    return data.map(p => this.mapProperty(p));
  }

  // Investor endpoints
  async getInvestorDashboard(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/investor/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async getInvestorPortfolio(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/investor/portfolio`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  // AI Chat
  async sendAIMessage(message: string, history: { role: string; content: string }[], conversationId?: number | null): Promise<{ message: string; provider: string; model: string; conversation_id?: number }> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message, history, conversation_id: conversationId }),
    });
    return this.handleResponse(response);
  }

  async getAIConversations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/ai/conversations`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getAIConversationDetails(conversationId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Health check
  async healthCheck(): Promise<any> {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const response = await fetch(`${baseUrl}/health`);
    return this.handleResponse<any>(response);
  }

  // User Features
  async getFavorites(): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/user/favorites`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response);
    return data.map(p => this.mapProperty(p));
  }

  async addFavorite(propertyId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/favorites/${propertyId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async removeFavorite(propertyId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/favorites/${propertyId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async toggleFavorite(propertyId: number): Promise<any> {
    const favorites = await this.getFavorites();
    const isFavorite = favorites.some(p => p.id === propertyId);
    if (isFavorite) {
      return this.removeFavorite(propertyId);
    } else {
      return this.addFavorite(propertyId);
    }
  }

  async getSearches(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/user/searches`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async saveSearch(searchData: { name: string, filters: any }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/searches`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(searchData),
    });
    return this.handleResponse<any>(response);
  }

  async deleteSearch(searchId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/searches/${searchId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async getMessages(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/user/messages`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getReceivedMessages(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/user/messages/received`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getConversations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/user/conversations`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  /** Sin receiver_id el backend envía el mensaje al propietario del anuncio. */
  async sendMessage(msgData: { property_id?: number, receiver_id?: number, content: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(msgData),
    });
    return this.handleResponse<any>(response);
  }

  async replyMessage(messageId: number, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/messages/${messageId}/reply`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return this.handleResponse<any>(response);
  }

  // ─── Mi cartera inmobiliaria ───

  async getPortfolio(): Promise<Portfolio> {
    const response = await fetch(`${API_BASE_URL}/portfolio`, { headers: this.getAuthHeaders() });
    return this.handleResponse<Portfolio>(response);
  }

  async savePortfolioProperty(data: PortfolioPropertyInput, id?: number): Promise<PortfolioProperty> {
    const response = await fetch(`${API_BASE_URL}/portfolio/properties${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PortfolioProperty>(response);
  }

  async deletePortfolioProperty(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/portfolio/properties/${id}`, { method: 'DELETE', headers: this.getAuthHeaders() });
    await this.handleResponse(response);
  }

  async savePortfolioItems(items: PortfolioItem[]): Promise<PortfolioItem[]> {
    const response = await fetch(`${API_BASE_URL}/portfolio/items`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(items.map(({ kind, name, description, amount }) => ({ kind, name, description, amount }))),
    });
    return this.handleResponse<PortfolioItem[]>(response);
  }

  async searchMunicipios(q: string): Promise<MunicipioOption[]> {
    const response = await fetch(`${API_BASE_URL}/portfolio/municipios?q=${encodeURIComponent(q)}`, { headers: this.getAuthHeaders() });
    return this.handleResponse<MunicipioOption[]>(response);
  }

  // ─── Ubica Play ───

  async getTasadorDaily(): Promise<TasadorDaily> {
    const response = await fetch(`${API_BASE_URL}/games/tasador/daily`, { headers: this.getAuthHeaders() });
    return this.handleResponse<TasadorDaily>(response, { skipAuthRedirect: true });
  }

  async sendTasadorGuess(day: string, round: number, guess: number): Promise<TasadorReveal> {
    const response = await fetch(`${API_BASE_URL}/games/tasador/daily/guess`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ day, round, guess }),
    });
    return this.handleResponse<TasadorReveal>(response, { skipAuthRedirect: true });
  }

  async getTasadorRanking(limit = 10): Promise<TasadorRankingEntry[]> {
    const response = await fetch(`${API_BASE_URL}/games/tasador/leaderboard?limit=${limit}`);
    return this.handleResponse<TasadorRankingEntry[]>(response);
  }

  /** Empieza una partida de La Torre: la puntuación final se envía con este token. */
  async startBalanceGame(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/games/balance/start`, { method: 'POST', headers: this.getAuthHeaders() });
    return (await this.handleResponse<{ session_token: string }>(response)).session_token;
  }

  async saveBalanceScore(score: number, sessionToken: string): Promise<{ message: string; score: number }> {
    const response = await fetch(`${API_BASE_URL}/games/score`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ game_name: 'balance', score, session_token: sessionToken }),
    });
    return this.handleResponse(response);
  }

  async getBalanceLeaderboard(limit = 10): Promise<GameLeaderboardEntry[]> {
    const response = await fetch(`${API_BASE_URL}/games/balance/leaderboard?limit=${limit}`);
    return this.handleResponse<GameLeaderboardEntry[]>(response);
  }
}

export const apiService = new ApiService();
export default apiService;
