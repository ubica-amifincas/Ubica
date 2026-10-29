import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Solo se guarda cuando alguien elige el tema con el botón; mientras tanto se sigue al sistema.
// (La clave antigua "ubica-theme" se guardaba siempre, aunque nadie hubiera elegido: se descarta.)
const CHOICE_KEY = 'ubica-theme-choice';
const LEGACY_KEY = 'ubica-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readChoice(): Theme | null {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const saved = localStorage.getItem(CHOICE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Theme | null>(readChoice);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = choice ?? system;

  // Si el sistema cambia (p. ej. modo oscuro automático al anochecer), la web cambia con él
  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return;
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setChoice(newTheme);
    try { localStorage.setItem(CHOICE_KEY, newTheme); } catch { /* sin almacenamiento: vale para esta visita */ }
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
