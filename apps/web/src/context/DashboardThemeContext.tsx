"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type DashboardThemePreference = "light" | "dark" | "system";
export type DashboardResolvedTheme = "light" | "dark";

const STORAGE_KEY = "cup360-dashboard-theme";

interface DashboardThemeContextValue {
  preference: DashboardThemePreference;
  resolvedTheme: DashboardResolvedTheme;
  setPreference: (preference: DashboardThemePreference) => void;
}

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function getSystemTheme(): DashboardResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: DashboardThemePreference): DashboardResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

function readStoredPreference(): DashboardThemePreference {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "dark";
}

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<DashboardThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<DashboardResolvedTheme>("dark");

  useLayoutEffect(() => {
    const stored = readStoredPreference();
    setPreferenceState(stored);
    setResolvedTheme(resolveTheme(stored));
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dashboard-theme-light", resolvedTheme === "light");
    return () => {
      document.documentElement.classList.remove("dashboard-theme-light");
    };
  }, [resolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      if (preference === "system") {
        setResolvedTheme(getSystemTheme());
      }
    };
    syncSystem();
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [preference]);

  const setPreference = useCallback((next: DashboardThemePreference) => {
    setPreferenceState(next);
    setResolvedTheme(resolveTheme(next));
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <DashboardThemeContext.Provider value={value}>{children}</DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) {
    throw new Error("useDashboardTheme deve ser usado dentro de DashboardThemeProvider");
  }
  return ctx;
}
