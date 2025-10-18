import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark";

type Palette = {
  background: string;
  card: string;
  surface: string;
  border: string;
  text: string;
  mutedText: string;
  accent: string;
  accentText: string;
  danger: string;
  success: string;
  mapControl: string;
};

type ThemeContextValue = {
  theme: ThemeMode;
  palette: Palette;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "mvf-theme";

const lightPalette: Palette = {
  background: "#f8fafc",
  card: "#ffffff",
  surface: "rgba(255,255,255,0.9)",
  border: "#d5dbe6",
  text: "#0f172a",
  mutedText: "#64748b",
  accent: "#2563eb",
  accentText: "#ffffff",
  danger: "#dc2626",
  success: "#059669",
  mapControl: "rgba(15,23,42,0.65)",
};

const darkPalette: Palette = {
  background: "#020617",
  card: "#0f172a",
  surface: "rgba(15,23,42,0.88)",
  border: "#1f2937",
  text: "#f8fafc",
  mutedText: "#94a3b8",
  accent: "#60a5fa",
  accentText: "#020617",
  danger: "#f87171",
  success: "#34d399",
  mapControl: "rgba(15,23,42,0.85)",
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const scheme = Appearance.getColorScheme();
    return scheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === "light" || value === "dark") {
          setThemeState(value);
        }
      })
      .catch(() => {
        // Storage read failures fall back to system preference.
      });
  }, []);

  const persistTheme = useCallback(async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore persistence errors; theme already updated in state.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    persistTheme(theme === "light" ? "dark" : "light");
  }, [persistTheme, theme]);

  const palette = useMemo(() => (theme === "dark" ? darkPalette : lightPalette), [theme]);

  const value = useMemo(
    () => ({
      theme,
      palette,
      toggleTheme,
      setTheme: persistTheme,
    }),
    [palette, persistTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
