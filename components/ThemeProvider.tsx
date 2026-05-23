'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { palettes, defaultPalette, ColorPalette } from '@/lib/color-palettes';

interface ThemeContextType {
  theme: string;
  palette: string;
  colors: ColorPalette;
  toggleTheme: () => void;
  setPalette: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  palette: defaultPalette,
  colors: palettes[defaultPalette],
  toggleTheme: () => {},
  setPalette: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('dark');
  const [palette, setPaletteState] = useState(defaultPalette);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedPalette = localStorage.getItem('palette') || defaultPalette;
    setTheme(savedTheme);
    setPaletteState(savedPalette);
    applyTheme(savedTheme, savedPalette);
  }, []);

  const applyTheme = (t: string, p: string) => {
    const mode = t === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-palette', p);

    const colors = palettes[p]?.[mode as 'light' | 'dark'] || palettes[defaultPalette][mode as 'light' | 'dark'];
    const root = document.documentElement.style;
    root.setProperty('--color-bg', colors.bg);
    root.setProperty('--color-text', colors.text);
    root.setProperty('--color-primary', colors.primary);
    root.setProperty('--color-income', colors.income);
    root.setProperty('--color-expense', colors.expense);
    root.setProperty('--color-card-bg', colors.cardBg);
    root.setProperty('--color-border', colors.border);
    root.setProperty('--color-muted', colors.muted);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme, palette);
  };

  const setPalette = (name: string) => {
    if (!palettes[name]) return;
    setPaletteState(name);
    localStorage.setItem('palette', name);
    applyTheme(theme, name);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      palette,
      colors: palettes[palette] || palettes[defaultPalette],
      toggleTheme,
      setPalette,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
