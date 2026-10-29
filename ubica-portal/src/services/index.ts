import { apiService } from './apiService';

// Tipos comunes exportados para no romper los imports en componentes
export type { User, LoginRequest, LoginResponse, CreateUserRequest, UpdateUserRequest, AdminDashboardStats, ContactRequest } from './apiService';
export type { Property } from '../types';

// Único cliente del backend real
export const appService = apiService;

export default appService;
