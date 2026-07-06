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
import {
  applyDashboardThemeToDocument,
  restorePublicSiteTheme,
} from "@/lib/dashboard-theme-document";

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
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const stored = readStoredPreference();
    const resolved = resolveTheme(stored);
    setPreferenceState(stored);
    setResolvedTheme(resolved);
    applyDashboardThemeToDocument(resolved);
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    applyDashboardThemeToDocument(resolvedTheme);
  }, [resolvedTheme, ready]);

  useEffect(() => {
    return () => {
      restorePublicSiteTheme();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      if (preference === "system") {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyDashboardThemeToDocument(resolved);
      }
    };
    syncSystem();
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [preference]);

  const setPreference = useCallback((next: DashboardThemePreference) => {
    const resolved = resolveTheme(next);
    setPreferenceState(next);
    setResolvedTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage indisponível */
    }
    applyDashboardThemeToDocument(resolved);
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
