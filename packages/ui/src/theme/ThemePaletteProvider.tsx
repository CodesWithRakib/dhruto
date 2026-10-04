'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type ThemePaletteId =
  | 'fresh-green'
  | 'emerald'
  | 'forest'
  | 'blue-commerce'
  | 'teal'
  | 'terracotta';

export type ThemeColorTokens = Record<string, string>;

export interface ThemePaletteDefinition {
  id: ThemePaletteId;
  nameEn: string;
  nameBn: string;
  primaryHex: string;
  tokens: {
    light: ThemeColorTokens;
  };
}

export const ACTIVE_THEME: ThemePaletteId = 'emerald';
export const THEME_STORAGE_KEY = 'dhruto_theme_palette';

export const AVAILABLE_THEMES: Record<ThemePaletteId, ThemePaletteDefinition> = {
  'emerald': {
    id: 'emerald',
    nameEn: 'Emerald (Default)',
    nameBn: 'এমেরাল্ড (ডিফল্ট)',
    primaryHex: '#10b981',
    tokens: {
      light: {
        'background': '0 0% 100%',
        'foreground': '240 10% 3.9%',
        'primary': '142.1 76.2% 36.3%',
        'primary-foreground': '355.7 100% 97.3%',
        'border': '240 5.9% 90%',
        'input': '240 5.9% 90%',
        'ring': '142.1 76.2% 36.3%',
        'radius': '0.5rem',
      },
    },
  },
  'blue-commerce': {
    id: 'blue-commerce',
    nameEn: 'Blue Commerce',
    nameBn: 'ব্লু কমার্স',
    primaryHex: '#3b82f6',
    tokens: {
      light: {
        'background': '0 0% 100%',
        'foreground': '240 10% 3.9%',
        'primary': '221.2 83.2% 53.3%',
        'primary-foreground': '210 40% 98%',
        'border': '214.3 31.8% 91.4%',
        'input': '214.3 31.8% 91.4%',
        'ring': '221.2 83.2% 53.3%',
        'radius': '0.5rem',
      },
    },
  },
} as any;

export function getThemePalette(id: string): ThemePaletteDefinition {
  return (AVAILABLE_THEMES as any)[id] || AVAILABLE_THEMES['emerald'];
}

interface ThemePaletteContextType {
  palette: ThemePaletteId;
  setPalette: (id: ThemePaletteId) => void;
  currentTheme: ThemePaletteDefinition;
  availablePalettes: ThemePaletteDefinition[];
}

const ThemePaletteContext = createContext<ThemePaletteContextType | null>(null);

function getInitialPalette(): ThemePaletteId {
  if (typeof window === 'undefined') return ACTIVE_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePaletteId | null;
    if (stored && AVAILABLE_THEMES[stored]) {
      return stored;
    }
  } catch {
    // Ignore
  }
  return ACTIVE_THEME;
}

export function ThemePaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<ThemePaletteId>(getInitialPalette);

  const currentTheme = useMemo(() => getThemePalette(palette), [palette]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', palette);
    const tokens = currentTheme.tokens.light;
    if (tokens) {
      const rootStyle = document.documentElement.style;
      Object.entries(tokens).forEach(([key, value]) => {
        rootStyle.setProperty(`--${key}`, value as string);
      });
    }
  }, [palette, currentTheme]);

  const setPalette = (id: ThemePaletteId) => {
    if (!AVAILABLE_THEMES[id]) return;
    setPaletteState(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Ignore
    }
  };

  const availablePalettes = useMemo(() => Object.values(AVAILABLE_THEMES), []);

  const value = useMemo(
    () => ({ palette, setPalette, currentTheme, availablePalettes }),
    [palette, currentTheme, availablePalettes]
  );

  return <ThemePaletteContext.Provider value={value}>{children}</ThemePaletteContext.Provider>;
}

export function useThemePalette(): ThemePaletteContextType {
  const context = useContext(ThemePaletteContext);
  if (!context) {
    throw new Error('useThemePalette must be used within a ThemePaletteProvider');
  }
  return context;
}
