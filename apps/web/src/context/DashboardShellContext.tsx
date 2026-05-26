"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SidebarDesktopMode = "expanded" | "icons" | "hidden";

const STORAGE_KEY = "bcg-dashboard-sidebar-mode";

interface DashboardShellContextValue {
  /** Overlay mobile (drawer) */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  onNavClick: () => void;
  /** Desktop: expandido, só ícones ou oculto */
  sidebarDesktopMode: SidebarDesktopMode;
  setSidebarDesktopMode: (mode: SidebarDesktopMode) => void;
  cycleSidebarDesktopMode: () => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

function isMobileNav(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function readStoredMode(): SidebarDesktopMode {
  if (typeof window === "undefined") return "expanded";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "icons" || stored === "hidden" || stored === "expanded") return stored;
  return "expanded";
}

export function DashboardShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarDesktopMode, setSidebarDesktopModeState] = useState<SidebarDesktopMode>("expanded");

  useEffect(() => {
    setSidebarDesktopModeState(readStoredMode());
  }, []);

  const persistMode = useCallback((mode: SidebarDesktopMode) => {
    setSidebarDesktopModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const setSidebarDesktopMode = useCallback(
    (mode: SidebarDesktopMode) => {
      persistMode(mode);
    },
    [persistMode],
  );

  const cycleSidebarDesktopMode = useCallback(() => {
    setSidebarDesktopModeState((prev) => {
      const next: SidebarDesktopMode =
        prev === "expanded" ? "icons" : prev === "icons" ? "hidden" : "expanded";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const onNavClick = useCallback(() => {
    if (isMobileNav()) setSidebarOpen(false);
  }, []);

  return (
    <DashboardShellContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        onNavClick,
        sidebarDesktopMode,
        setSidebarDesktopMode,
        cycleSidebarDesktopMode,
      }}
    >
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell(): DashboardShellContextValue {
  const ctx = useContext(DashboardShellContext);
  if (!ctx) {
    throw new Error("useDashboardShell must be used within DashboardShellProvider");
  }
  return ctx;
}
