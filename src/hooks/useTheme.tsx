'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('game-hub-theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Default to auto if no theme is saved
      setThemeState('auto');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Save theme to localStorage
    localStorage.setItem('game-hub-theme', theme);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const isDarkMode = mediaQuery.matches;
      setIsDark(isDarkMode);
      root.classList.add(isDarkMode ? 'dark' : 'light');
      
      // Listen for system theme changes
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      const isDarkMode = theme === 'dark';
      setIsDark(isDarkMode);
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Always provide the context with safe default values
  const contextValue = {
    theme: theme || 'light',
    setTheme,
    isDark: isDark || false
  };

  return (
    <ThemeContext.Provider value={contextValue}>
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
