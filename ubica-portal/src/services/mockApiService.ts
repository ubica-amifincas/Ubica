/**
 * Ubica Mock API Service
 * Sistema de autenticación simulado que funciona sin backend
 * AMI Fincas
 */

import type { LoginRequest, LoginResponse, User } from './apiService';
import type { Property } from '../types';

export interface DashboardStats {
  total_properties: number;
  total_users: number;
  total_transactions: number;
  total_revenue: number;
  properties_sold_this_month: number;
  properties_rented_this_month: number;
  average_roi: number;
  market_growth: number;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'realtor' | 'investor' | 'user';
  company?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'realtor' | 'investor' | 'user';
  company?: string;
  phone?: string;
  is_active?: boolean;
}

export interface CreatePropertyRequest {
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
  images: string[];
  features: string[];
  yearBuilt?: number;
  orientation?: string;
  energyRating?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  investmentData?: { roi: number; rentalYield: number; monthsOnMarket: number; priceHistory?: number[] };
}

export interface UpdatePropertyRequest {
  title?: string;
  price?: number;
  type?: string;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  location?: string;
  address?: string;
  description?: string;
  images?: string[];
  features?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Datos simulados
const MOCK_USERS = [
  {
    id: 1,
    email: "admin@amifincas.es",
    full_name: "Administrador Ubica",
    role: "admin",
    company: "AMI Fincas",
    phone: "+34 968 123 456",
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    email: "inmobiliaria1@amifincas.es",
    full_name: "Costa Cálida Properties",
    role: "realtor",
    company: "Costa Cálida Properties SL",
    phone: "+34 968 234 567",
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    email: "inversor1@amifincas.es",
    full_name: "Inversiones Mediterráneo",
    role: "investor",
    company: "Inversiones Mediterráneo SA",
    phone: "+34 968 345 678",
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    email: "administrador@amifincas.es",
    full_name: "Gestión de Fincas Murcia",
    role: "property_manager",
    company: "Gestión de Fincas Murcia SL",
    phone: "+34 968 456 789",
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_CREDENTIALS = {
  "admin@amifincas.es": "admin123",
  "inmobiliaria1@amifincas.es": "realtor123",
  "inversor1@amifincas.es": "investor123",
  "administrador@amifincas.es": "manager123"
};

class MockApiService {
  // Clave para localStorage
  private readonly USERS_STORAGE_KEY = 'ubica_users';
  private readonly PROPERTIES_STORAGE_KEY = 'ubica_properties';
  private readonly SEARCHES_STORAGE_KEY = 'ubica_searches';

  // Simular delay de red
  private async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Gestión de usuarios en localStorage
  private getUsersFromStorage(): User[] {
    try {
      const stored = localStorage.getItem(this.USERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [...MOCK_USERS];
    } catch {
      return [...MOCK_USERS];
    }
  }

  private saveUsersToStorage(users: User[]): void {
    localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
  }

  // Gestión de propiedades en localStorage
  private async getPropertiesFromStorage(): Promise<Property[]> {
    try {
      const stored = localStorage.getItem(this.PROPERTIES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      } else {
        // Cargar desde archivo inicial
        const response = await fetch('/propertiesMurcia.json');
        const properties = await response.json();
        this.savePropertiesToStorage(properties);
        return properties;
      }
    } catch {
      return [];
    }
  }

  private savePropertiesToStorage(properties: Property[]): void {
    localStorage.setItem(this.PROPERTIES_STORAGE_KEY, JSON.stringify(properties));
  }

  // Generar token simulado
  private generateToken(user: User): string {
    return btoa(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 3600000 }));
  }

  // Validar token
  private validateToken(token: string): User | null {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp < Date.now()) return null;
      // Buscar en localStorage para incluir usuarios creados dinámicamente
      const users = this.getUsersFromStorage();
      return users.find(u => u.id === decoded.userId) || null;
    } catch {
      return null;
    }
  }

  // Obtener usuario actual del token
  private getCurrentUserFromToken(): User | null {
    const token = localStorage.getItem('ubica_token');
    if (!token) return null;
    return this.validateToken(token);
  }

  // Autenticación
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    await this.delay(800); // Simular tiempo de respuesta

    const { email, password } = credentials;

    // Verificar credenciales desde localStorage para persistir registros
    const creds = JSON.parse(localStorage.getItem('ubica_creds') || JSON.stringify(MOCK_CREDENTIALS));
    if (creds[email] !== password) {
      throw new Error('Credenciales inválidas');
    }

    // Buscar usuario en localStorage (incluye usuarios creados dinámicamente)
    const users = this.getUsersFromStorage();
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const token = this.generateToken(user);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      user
    };
  }

  async register(userData: any): Promise<LoginResponse> {
    await this.delay(800);

    const users = this.getUsersFromStorage();
    if (users.find(u => u.email === userData.email)) {
      throw new Error('El email ya está registrado');
    }

    const newUser: User = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role || 'user',
      company: userData.company,
      phone: userData.phone,
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsersToStorage(users);

    const creds = JSON.parse(localStorage.getItem('ubica_creds') || JSON.stringify(MOCK_CREDENTIALS));
    creds[userData.email] = userData.password;
    localStorage.setItem('ubica_creds', JSON.stringify(creds));

    const token = this.generateToken(newUser);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      user: newUser
    };
  }

  async getCurrentUser(): Promise<User> {
    await this.delay(200);
    const user = this.getCurrentUserFromToken();
    if (!user) throw new Error('No autorizado');
    return user;
  }

  // Propiedades públicas
  async getProperties(skip = 0, limit = 20): Promise<Property[]> {
    await this.delay(300);

    try {
      const properties = await this.getPropertiesFromStorage();
      return properties.slice(skip, skip + limit);
    } catch {
      return [];
    }
  }

  async getProperty(id: number): Promise<Property> {
    await this.delay(200);

    try {
      const properties = await this.getPropertiesFromStorage();
      const property = properties.find(p => p.id === id);
      if (!property) throw new Error('Propiedad no encontrada');
      return property;
    } catch {
      throw new Error('Propiedad no encontrada');
    }
  }

  async getMarketStats(): Promise<any> {
    await this.delay(400);
    return {
      average_price: 385000,
      total_listings: 45,
      market_trend: 8.2,
      most_popular_type: "villa",
      average_days_on_market: 45
    };
  }

  // Admin endpoints
  async getAdminDashboard(): Promise<any> {
    await this.delay(600);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }

    try {
      const response = await fetch('/dashboardData.json');
      const dashboardData = await response.json();
      return dashboardData;
    } catch {
      // Datos de fallback
      return {
        overview: {
          total_users: 247,
          total_properties: 45,
          total_investments: 15,
          total_transactions: 68,
          total_property_value: 15750000,
          users_by_role: { admin: 2, realtor: 12, investor: 23, user: 210 },
          properties_by_status: { available: 28, sold: 12, rented: 5 }
        }
      };
    }
  }

  async getAllUsers(): Promise<User[]> {
    await this.delay(400);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }
    return this.getUsersFromStorage();
  }

  async getAllPropertiesAdmin(): Promise<Property[]> {
    await this.delay(500);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }
    return this.getPropertiesFromStorage();
  }

  async getAllPropertiesDashboard(): Promise<Property[]> {
    await this.delay(400);
    const user = this.getCurrentUserFromToken();
    if (!user) {
      throw new Error('No autenticado');
    }
    const allProps = await this.getPropertiesFromStorage();
    if (user.role === 'admin') return allProps;

    // Solo permitir visibilidad de propiedades que fueron creadas por el propio usuario 
    // o de las que es directamente el dueño o agente, tal como pide el usuario.
    return allProps.filter(p => p.owner_id === user.id || p.realtor_id === user.id);
  }

  // Realtor endpoints
  async getRealtorDashboard(): Promise<any> {
    await this.delay(500);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'realtor') {
      throw new Error('Acceso denegado');
    }

    try {
      const response = await fetch('/dashboardData.json');
      const dashboardData = await response.json();
      return {
        salesData: dashboardData.salesData || {},
        overview: {
          totalProperties: 15,
          totalSales: 8,
          totalCommissions: 42500,
          monthlyRevenue: 85000
        }
      };
    } catch {
      return {
        overview: {
          totalProperties: 15,
          totalSales: 8,
          totalCommissions: 42500,
          monthlyRevenue: 85000
        }
      };
    }
  }

  async getRealtorProperties(): Promise<Property[]> {
    await this.delay(400);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'realtor') {
      throw new Error('Acceso denegado');
    }

    const allProperties = await this.getProperties(0, 100);
    return allProperties.filter(p => p.realtor_id === user.id || Math.random() > 0.7);
  }

  // Investor endpoints
  async getInvestorDashboard(): Promise<any> {
    await this.delay(500);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'investor') {
      throw new Error('Acceso denegado');
    }

    try {
      const response = await fetch('/dashboardData.json');
      const dashboardData = await response.json();
      return {
        investmentData: dashboardData.investmentData || {},
        overview: {
          totalInvestments: 8,
          portfolioValue: 2450000,
          averageROI: 9.8,
          monthlyIncome: 18500
        }
      };
    } catch {
      return {
        overview: {
          totalInvestments: 8,
          portfolioValue: 2450000,
          averageROI: 9.8,
          monthlyIncome: 18500
        }
      };
    }
  }

  async getInvestorPortfolio(): Promise<any[]> {
    await this.delay(400);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'investor') {
      throw new Error('Acceso denegado');
    }

    const allProperties = await this.getProperties(0, 100);
    return allProperties
      .filter(() => Math.random() > 0.6)
      .map(p => ({
        ...p,
        investment_amount: p.price * 0.8,
        current_value: p.price * 1.2,
        roi: 8.5 + Math.random() * 5
      }));
  }

  // ==========================================
  // MÉTODOS CRUD PARA ADMINISTRADOR
  // ==========================================

  // CRUD Usuarios
  async createUser(userData: CreateUserRequest): Promise<User> {
    await this.delay(800);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }

    const users = this.getUsersFromStorage();

    // Verificar si el email ya existe
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Ya existe un usuario con este email');
    }

    // Crear nuevo usuario
    const newUser: User = {
      id: Math.max(...users.map(u => u.id)) + 1,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      company: userData.company,
      phone: userData.phone,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsersToStorage(users);

    // Guardar credenciales para que el usuario pueda hacer login
    if (userData.password) {
      const creds = JSON.parse(localStorage.getItem('ubica_creds') || JSON.stringify(MOCK_CREDENTIALS));
      creds[userData.email] = userData.password;
      localStorage.setItem('ubica_creds', JSON.stringify(creds));
    }

    return newUser;
  }

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    await this.delay(600);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }

    const users = this.getUsersFromStorage();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar email único si se está cambiando
    if (userData.email && userData.email !== users[userIndex].email) {
      if (users.find(u => u.email === userData.email && u.id !== userId)) {
        throw new Error('Ya existe un usuario con este email');
      }
    }

    // Actualizar usuario
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
      updated_at: new Date().toISOString()
    };

    this.saveUsersToStorage(users);

    return users[userIndex];
  }

  async deleteUser(userId: number): Promise<void> {
    await this.delay(500);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }

    // No permitir que el admin se elimine a sí mismo
    if (user.id === userId) {
      throw new Error('No puedes eliminarte a ti mismo');
    }

    const users = this.getUsersFromStorage();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('Usuario no encontrado');
    }

    users.splice(userIndex, 1);
    this.saveUsersToStorage(users);
  }

  async updateUserRole(userId: number, newRole: string): Promise<User> {
    await this.delay(400);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role !== 'admin') {
      throw new Error('Acceso denegado');
    }

    return this.updateUser(userId, { role: newRole as any });
  }

  // CRUD Propiedades
  async createProperty(propertyData: CreatePropertyRequest): Promise<Property> {
    await this.delay(800);
    const user = this.getCurrentUserFromToken();
    if (!user || user.role === 'user') {
      throw new Error('Solo administradores, inmobiliarias e inversores pueden crear propiedades');
    }

    const properties = await this.getPropertiesFromStorage();

    // Crear nueva propiedad
    const newProperty: Property = {
      id: Math.max(...properties.map(p => p.id)) + 1,
      title: propertyData.title,
      price: propertyData.price,
      type: propertyData.type as Property['type'],
      status: propertyData.status as Property['status'],
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      area: propertyData.area,
      location: propertyData.location,
      address: propertyData.address,
      description: propertyData.description,
      images: propertyData.images,
      features: propertyData.features,
      coordinates: propertyData.coordinates || { lat: 37.9922, lng: -1.1307 },
      yearBuilt: propertyData.yearBuilt || new Date().getFullYear(),
      orientation: propertyData.orientation || 'Sur',
      energyRating: propertyData.energyRating || 'A',
      investmentData: {
        roi: propertyData.investmentData?.roi || 5,
        rentalYield: propertyData.investmentData?.rentalYield || 4,
        monthsOnMarket: propertyData.investmentData?.monthsOnMarket || 0,
        priceHistory: propertyData.investmentData?.priceHistory || [propertyData.price]
      },
      owner_id: user.id,
      realtor_id: user.id,
      created_at: new Date().toISOString()
    };

    properties.push(newProperty);
    this.savePropertiesToStorage(properties);

    return newProperty;
  }

  async updateProperty(propertyId: number, propertyData: UpdatePropertyRequest): Promise<Property> {
    await this.delay(600);
    const user = this.getCurrentUserFromToken();
    if (!user) {
      throw new Error('No autenticado');
    }

    const properties = await this.getPropertiesFromStorage();
    const propertyIndex = properties.findIndex(p => p.id === propertyId);

    if (propertyIndex === -1) {
      throw new Error('Propiedad no encontrada');
    }

    const property = properties[propertyIndex];
    if (user.role !== 'admin' && property.owner_id !== user.id && property.realtor_id !== user.id) {
      throw new Error('No tienes permiso para editar esta propiedad');
    }

    // Actualizar propiedad
    const updatedPropData: any = { ...propertyData };
    if (updatedPropData.type) updatedPropData.type = updatedPropData.type as Property['type'];
    if (updatedPropData.status) updatedPropData.status = updatedPropData.status as Property['status'];

    properties[propertyIndex] = {
      ...properties[propertyIndex],
      ...updatedPropData
    };

    this.savePropertiesToStorage(properties);

    return properties[propertyIndex];
  }

  async deleteProperty(propertyId: number): Promise<void> {
    await this.delay(500);
    const user = this.getCurrentUserFromToken();
    if (!user) {
      throw new Error('No autenticado');
    }

    const properties = await this.getPropertiesFromStorage();
    const propertyIndex = properties.findIndex(p => p.id === propertyId);

    if (propertyIndex === -1) {
      throw new Error('Propiedad no encontrada');
    }

    const property = properties[propertyIndex];
    if (user.role !== 'admin' && property.owner_id !== user.id && property.realtor_id !== user.id) {
      throw new Error('No tienes permiso para eliminar esta propiedad');
    }

    properties.splice(propertyIndex, 1);
    this.savePropertiesToStorage(properties);
  }

  // User property endpoints — cada usuario gestiona sus propiedades
  async getUserProperties(): Promise<Property[]> {
    return this.getAllPropertiesDashboard();
  }

  async createUserProperty(propertyData: CreatePropertyRequest): Promise<Property> {
    return this.createProperty(propertyData);
  }

  async updateUserProperty(propertyId: number, propertyData: UpdatePropertyRequest): Promise<Property> {
    return this.updateProperty(propertyId, propertyData);
  }

  async deleteUserProperty(propertyId: number): Promise<void> {
    return this.deleteProperty(propertyId);
  }

  // Métodos auxiliares para validación
  private validateUserData(userData: CreateUserRequest | UpdateUserRequest): void {
    if ('email' in userData && userData.email && !this.isValidEmail(userData.email)) {
      throw new Error('Email inválido');
    }

    if ('role' in userData && userData.role && !['admin', 'realtor', 'investor', 'user'].includes(userData.role)) {
      throw new Error('Rol inválido');
    }
  }

  private validatePropertyData(propertyData: CreatePropertyRequest | UpdatePropertyRequest): void {
    if ('price' in propertyData && propertyData.price && propertyData.price <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }

    if ('bedrooms' in propertyData && propertyData.bedrooms && propertyData.bedrooms < 0) {
      throw new Error('El número de habitaciones no puede ser negativo');
    }

    if ('bathrooms' in propertyData && propertyData.bathrooms && propertyData.bathrooms < 0) {
      throw new Error('El número de baños no puede ser negativo');
    }

    if ('area' in propertyData && propertyData.area && propertyData.area <= 0) {
      throw new Error('El área debe ser mayor a 0');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Upload Images (mock)
  async uploadImages(files: File[]): Promise<string[]> {
    await this.delay(1000);
    // En modo mock, convertimos los archivos a URLs locales (data / blob) para que se vean en el frontend
    return files.map(file => URL.createObjectURL(file));
  }

  // Import Properties (mock)
  async importProperties(formData: FormData): Promise<any> {
    await this.delay(1500);
    return {
      message: "Importación simulada completada",
      properties_added: 2,
      errors: 0,
      error_details: []
    };
  }

  // AI Chat (redirige al backend real aunque estemos en modo mock para testear IA)
  async sendAIMessage(message: string, history: { role: string; content: string }[], conversationId?: number | null): Promise<{ message: string; provider: string; model: string; conversation_id?: number }> {
    // Determine use API url
    const isProdContainer = window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app');
    const defaultApiUrl = isProdContainer ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api';
    const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

    const token = localStorage.getItem('ubica_token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, history, conversation_id: conversationId }),
    });

    if (!response.ok) {
        throw new Error(`AI Request failed with status: ${response.status}`);
    }

    return response.json();
  }

  async getAIConversations(): Promise<any[]> {
    // Redirect to real backend as well since user state requires it
    const isProdContainer = window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app');
    const defaultApiUrl = isProdContainer ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api';
    const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
    
    const token = localStorage.getItem('ubica_token');
    const response = await fetch(`${API_BASE_URL}/ai/conversations`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok) return [];
    return response.json();
  }

  async getAIConversationDetails(conversationId: number): Promise<any> {
    const isProdContainer = window.location.hostname.includes('amifincas.es') || window.location.hostname.includes('vercel.app');
    const defaultApiUrl = isProdContainer ? 'https://ubica-backend.onrender.com/api' : 'http://localhost:8000/api';
    const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
    
    const token = localStorage.getItem('ubica_token');
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok) throw new Error("Could not fetch conversation details");
    return response.json();
  }


  // User Features (mock)
  async getFavorites(): Promise<Property[]> {
    await this.delay(300);
    return [];
  }

  async addFavorite(propertyId: number): Promise<any> {
    await this.delay(300);
    return { message: "Added to favorites", id: Date.now() };
  }

  async removeFavorite(propertyId: number): Promise<any> {
    await this.delay(300);
    return { message: "Removed from favorites" };
  }

  async toggleFavorite(propertyId: number): Promise<any> {
    await this.delay(300);
    return { message: "Toggled favorite" };
  }

  async getSearches(): Promise<any[]> {
    await this.delay(300);
    const stored = localStorage.getItem(this.SEARCHES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async saveSearch(searchData: { name: string, filters: any }): Promise<any> {
    await this.delay(300);
    const searches = await this.getSearches();
    const newSearch = {
      ...searchData,
      id: Date.now(),
      created_at: new Date().toISOString()
    };
    searches.push(newSearch);
    localStorage.setItem(this.SEARCHES_STORAGE_KEY, JSON.stringify(searches));
    return { message: "Búsqueda guardada", id: newSearch.id };
  }

  async deleteSearch(searchId: number): Promise<any> {
    await this.delay(300);
    const searches = await this.getSearches();
    const filtered = searches.filter(s => s.id !== searchId);
    localStorage.setItem(this.SEARCHES_STORAGE_KEY, JSON.stringify(filtered));
    return { message: "Búsqueda eliminada" };
  }

  async getMessages(): Promise<any[]> {
    await this.delay(300);
    return [];
  }

  async getReceivedMessages(): Promise<any[]> {
    await this.delay(300);
    return [];
  }

  async getConversations(): Promise<any[]> {
    await this.delay(300);
    return [];
  }

  async sendMessage(msgData: { property_id?: number, realtor_id?: number, receiver_id?: number, content: string }): Promise<any> {
    await this.delay(300);
    return { message: "Mensaje enviado", id: Date.now() };
  }

  async replyMessage(messageId: number, content: string): Promise<any> {
    await this.delay(300);
    return { message: "Respuesta enviada", id: Date.now() };
  }
}

export const mockApiService = new MockApiService();
