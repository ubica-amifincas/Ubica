import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import appService from '../services';

// Tipos para autenticación
export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  company?: string;
  is_active: boolean;
  is_verified?: boolean;
  phone?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  company?: string;
  phone?: string;
  role?: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar autenticación desde localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        // Limpiar datos corruptos
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función para realizar requests autenticados
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Si el token ha expirado, intentar refrescarlo
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Reintentar la request con el nuevo token
        headers['Authorization'] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
      } else {
        // Si no se puede refrescar, desloguear
        logout();
        throw new Error('Sesión expirada');
      }
    }

    return response;
  };

  // Función para refrescar el token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      }
    } catch (error) {
      console.error('Error refrescando token:', error);
    }

    return false;
  };

  // Función de login usando mock service
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const data = await appService.login({ email, password });

      // Guardar datos en localStorage
      localStorage.setItem('ubica_token', data.access_token);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Actualizar estado
      setToken(data.access_token);
      setUser(data.user);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de registro
  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      await appService.register(userData);
      // Tras registrarse correctamente, no logueamos ni guardamos token todavía, 
      // ya que el correo debe ser verificado primero.
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    // Limpiar localStorage
    localStorage.removeItem('ubica_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // Limpiar estado
    setToken(null);
    setUser(null);
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;

    if (typeof roles === 'string') {
      return user.role === roles;
    }

    return roles.includes(user.role);
  };

  // Actualizar datos del usuario
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    register,
    updateUser,
    loading,
    isAuthenticated,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el mock API service
export const useAuthenticatedFetch = () => {
  const { logout } = useAuth();

  // Retornar la API elegida dinámicamente según entorno
  return appService;
};

export default AuthContext;
