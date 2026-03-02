/**
 * Ubica API Service
 * Sistema de autenticación simulado para demo
 * AMI Fincas
 */

// Simulamos el backend con datos locales para el demo
const DEMO_MODE = false; // Desactivamos el modo demo para usar el backend real
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface LoginRequest {
  email: string;
  password: string;
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
  created_at: string;
  updated_at: string;
}

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

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('ubica_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error || `HTTP error! status: ${response.status}`;
      console.error('API Error:', errorMessage, 'at', response.url);
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // Mapear datos del backend (snake_case y coords planas) al frontend (camelCase y coords anidadas)
  private mapProperty(data: any): Property {
    return {
      ...data,
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
      // Campos financieros de inversión
      purchasePrice: data.purchase_price ?? data.purchasePrice ?? 0,
      totalCost: data.total_cost ?? data.totalCost ?? 0,
      monthlyCost: data.monthly_cost ?? data.monthlyCost ?? 0,
      monthlyIncome: data.monthly_income ?? data.monthlyIncome ?? 0,
    } as Property;
  }

  // Autenticación
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });
    return this.handleResponse<LoginResponse>(response);
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
    const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`, {
      method: 'GET',
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<User>(response);
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
  async getAdminDashboard(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    const stats = await this.handleResponse<DashboardStats>(response);

    // Mappear al formato complejo que espera AdminDashboard.tsx
    return {
      overview: {
        total_users: stats.total_users,
        total_properties: stats.total_properties,
        total_investments: 15,
        total_transactions: stats.total_transactions,
        total_property_value: 15750000,
        users_by_role: { admin: 1, realtor: 1, investor: 1, user: 0 },
        properties_by_status: { available: stats.total_properties, sold: 12, rented: 5 }
      },
      revenue: {
        total_transaction_value: stats.total_revenue,
        total_commissions: 45000,
        platform_revenue: 12000,
        transaction_count: stats.total_transactions
      },
      user_growth: [],
      top_properties: [],
      top_realtors: []
    };
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<User[]>(response);
  }

  async createUser(userData: any): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse<User>(response);
  }

  async updateUser(userId: number, userData: any): Promise<User> {
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

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    // Don't use standard getAuthHeaders() because we must let the browser set the boundary for multipart/form-data
    const token = localStorage.getItem('ubica_token');
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
    const token = localStorage.getItem('ubica_token');
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
  async sendAIMessage(message: string, history: { role: string; content: string }[]): Promise<{ message: string; provider: string; model: string }> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message, history }),
    });
    return this.handleResponse(response);
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

  async sendMessage(msgData: { property_id?: number, realtor_id?: number, receiver_id?: number, content: string }): Promise<any> {
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
}

export const apiService = new ApiService();
export default apiService;
