import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {
  classic: {
    name: 'Classic',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#f8fafc',
      surface: '#ffffff',
      toolbar: '#1a1a2e',
      toolbarBorder: '#2d2d44',
      toolbarButton: '#4a4a6a',
      toolbarButtonHover: '#5a5a7a',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      nodeColors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6b7280'],
      genderMale: '#dbeafe',
      genderMaleBorder: '#3b82f6',
      genderFemale: '#fce7f3',
      genderFemaleBorder: '#ec4899',
    },
  },
  sepia: {
    name: 'Vintage',
    colors: {
      primary: '#8b7355',
      secondary: '#a0522d',
      accent: '#cd853f',
      background: '#f5f0e6',
      surface: '#fffef9',
      toolbar: '#3d2b1f',
      toolbarBorder: '#5c4033',
      toolbarButton: '#6b5344',
      toolbarButtonHover: '#7d6354',
      text: '#3d2b1f',
      textMuted: '#6b5344',
      border: '#d4c4a8',
      nodeColors: ['#8b7355', '#a0522d', '#cd853f', '#daa520', '#6b8e23', '#5f9ea0', '#696969'],
      genderMale: '#e8e4d9',
      genderMaleBorder: '#8b7355',
      genderFemale: '#f5e6e0',
      genderFemaleBorder: '#cd853f',
    },
  },
  forest: {
    name: 'Forest',
    colors: {
      primary: '#2d5a27',
      secondary: '#4a7c59',
      accent: '#8fbc8f',
      background: '#f0f4f0',
      surface: '#ffffff',
      toolbar: '#1a2e1a',
      toolbarBorder: '#2d442d',
      toolbarButton: '#3d5a3d',
      toolbarButtonHover: '#4d6a4d',
      text: '#1a2e1a',
      textMuted: '#4a6a4a',
      border: '#c8d8c8',
      nodeColors: ['#2d5a27', '#4a7c59', '#6b8e23', '#8fbc8f', '#556b2f', '#228b22', '#696969'],
      genderMale: '#e0ebe0',
      genderMaleBorder: '#4a7c59',
      genderFemale: '#f0e8e0',
      genderFemaleBorder: '#8b6914',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0077b6',
      secondary: '#0096c7',
      accent: '#48cae4',
      background: '#f0f8ff',
      surface: '#ffffff',
      toolbar: '#03045e',
      toolbarBorder: '#023e8a',
      toolbarButton: '#0077b6',
      toolbarButtonHover: '#0096c7',
      text: '#03045e',
      textMuted: '#0077b6',
      border: '#caf0f8',
      nodeColors: ['#0077b6', '#0096c7', '#48cae4', '#00b4d8', '#90e0ef', '#023e8a', '#6b7280'],
      genderMale: '#e0f4ff',
      genderMaleBorder: '#0077b6',
      genderFemale: '#ffe0f0',
      genderFemaleBorder: '#d63384',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#818cf8',
      secondary: '#a78bfa',
      accent: '#f472b6',
      background: '#0f0f1a',
      surface: '#1a1a2e',
      toolbar: '#0a0a14',
      toolbarBorder: '#2d2d44',
      toolbarButton: '#3d3d5c',
      toolbarButtonHover: '#4d4d6c',
      text: '#e5e7eb',
      textMuted: '#9ca3af',
      border: '#374151',
      nodeColors: ['#818cf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#9ca3af'],
      genderMale: '#1e3a5f',
      genderMaleBorder: '#60a5fa',
      genderFemale: '#4a1942',
      genderFemaleBorder: '#f472b6',
    },
  },
  darcula: {
    name: 'Darcula',
    colors: {
      primary: '#cc7832',
      secondary: '#ffc66d',
      accent: '#6a8759',
      background: '#2b2b2b',
      surface: '#3c3f41',
      toolbar: '#1e1e1e',
      toolbarBorder: '#323232',
      toolbarButton: '#4c5052',
      toolbarButtonHover: '#5c6164',
      text: '#a9b7c6',
      textMuted: '#808080',
      border: '#4d4d4d',
      nodeColors: ['#cc7832', '#ffc66d', '#6a8759', '#9876aa', '#6897bb', '#a5c261', '#808080'],
      genderMale: '#2d3a4a',
      genderMaleBorder: '#6897bb',
      genderFemale: '#4a2d3a',
      genderFemaleBorder: '#9876aa',
    },
  },
  forestDark: {
    name: 'Forest Dark',
    colors: {
      primary: '#4a9c4a',
      secondary: '#6bb86b',
      accent: '#8fbc8f',
      background: '#0d1a0d',
      surface: '#1a2e1a',
      toolbar: '#0a140a',
      toolbarBorder: '#1e3a1e',
      toolbarButton: '#2d4a2d',
      toolbarButtonHover: '#3d5a3d',
      text: '#c8e6c8',
      textMuted: '#7ba87b',
      border: '#2d4a2d',
      nodeColors: ['#4a9c4a', '#6bb86b', '#8fbc8f', '#6b8e23', '#228b22', '#32cd32', '#7ba87b'],
      genderMale: '#1a3a2a',
      genderMaleBorder: '#4a9c4a',
      genderFemale: '#2a2a1a',
      genderFemaleBorder: '#9c8a4a',
    },
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    return localStorage.getItem('heritage-theme') || 'classic';
  });

  const theme = themes[themeName] || themes.classic;

  useEffect(() => {
    localStorage.setItem('heritage-theme', themeName);

    // Apply CSS variables to root
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      }
    });
  }, [themeName, theme]);

  const setTheme = (name) => {
    if (themes[name]) {
      setThemeName(name);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themes };
