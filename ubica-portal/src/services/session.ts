/**
 * Sesión del usuario guardada en localStorage.
 * El token vive en UNA sola clave: `access_token`.
 */

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';
const LEGACY_KEYS = ['ubica_token', 'refresh_token'];

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser<T = unknown>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
}

export function saveUser(user: unknown): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
  } catch {
    /* almacenamiento no disponible */
  }
}
