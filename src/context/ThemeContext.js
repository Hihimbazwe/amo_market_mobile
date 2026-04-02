import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LightTheme = {
  background: '#F8FAFC',
  foreground: '#0F172A',
  muted: '#64748B',
  primary: '#e67e22',
  secondary: '#0284c7',
  accent: '#313273',
  neonCyan: '#0ea5e9',
  neonPurple: '#f47a22',
  glass: 'rgba(0, 0, 0, 0.05)',
  glassBorder: 'rgba(0, 0, 0, 0.1)',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  white: '#ffffff',
  black: '#000000',
  card: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
};

const DarkTheme = {
  background: '#030712',
  foreground: '#e2e8f0',
  muted: '#94a3b8',
  primary: '#e67e22',
  secondary: '#0284c7',
  accent: '#313273',
  neonCyan: '#0ea5e9',
  neonPurple: '#f47a22',
  glass: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  inputBg: 'rgba(255, 255, 255, 0.04)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  white: '#ffffff',
  black: '#000000',
  card: '#0b101b',
  border: 'rgba(255,255,255,0.05)',
  success: '#10B981',
  error: '#EF4444',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user-theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        setIsDarkMode(systemScheme === 'dark');
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('user-theme', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const colors = isDarkMode ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
