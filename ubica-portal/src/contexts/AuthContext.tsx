import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import appService from '../services';
import { getToken, getStoredUser, saveSession, saveUser, clearSession } from '../services/session';

// Tipos para autenticación
export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  company?: string;
  is_active: boolean;
  is_verified?: boolean;
  /** Inmobiliarias dadas de alta solas: false hasta que el admin las aprueba */
  is_approved?: boolean;
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
  /** Guarda una sesión nueva (p. ej. el token que devuelve el cambio de contraseña). */
  setSession: (token: string, user: User) => void;
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
  /** Casilla obligatoria de condiciones y privacidad */
  accept_terms?: boolean;
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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => (getToken() ? getStoredUser<User>() : null));
  const [token, setToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(() => !!getToken());

  // Al arrancar, validar el token guardado contra el backend
  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      clearSession(); // limpia restos de claves antiguas
      setLoading(false);
      return;
    }

    let cancelled = false;
    appService.getCurrentUser(true)
      .then(freshUser => {
        if (cancelled) return;
        setUser(freshUser as User);
        saveUser(freshUser);
      })
      .catch(error => {
        if (cancelled) return;
        // Solo cerramos sesión si el token ya no es válido; un fallo de red no debe echar al usuario
        const message = error instanceof Error ? error.message : '';
        const networkError = error instanceof TypeError || /failed to fetch|network/i.test(message);
        if (!networkError) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = (newToken: string, newUser: User) => {
    saveSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const data = await appService.login({ email, password });
      setSession(data.access_token, data.user as User);
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
      // Tras registrarse no se inicia sesión: el correo debe verificarse primero.
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
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

  // Actualizar datos del usuario en memoria
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    saveUser(updatedUser);
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    register,
    updateUser,
    setSession,
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

/** Devuelve el cliente del backend (el token se añade automáticamente). */
export const useAuthenticatedFetch = () => appService;

export default AuthContext;
