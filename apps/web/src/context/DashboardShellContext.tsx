"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SidebarDesktopMode = "expanded" | "icons" | "hidden";

const STORAGE_KEY = "bcg-dashboard-sidebar-mode";

interface DashboardShellContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  onNavClick: () => void;
  sidebarDesktopMode: SidebarDesktopMode;
  setSidebarDesktopMode: (mode: SidebarDesktopMode) => void;
  cycleSidebarDesktopMode: () => void;
  navFlyoutOpen: boolean;
  navFlyoutDepartmentId: string | null;
  navFlyoutModuleStack: string[];
  openNavFlyout: (departmentId: string) => void;
  pushNavFlyoutModule: (moduleId: string) => void;
  popNavFlyoutModule: () => void;
  closeNavFlyout: () => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
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
  const [navFlyoutOpen, setNavFlyoutOpen] = useState(false);
  const [navFlyoutDepartmentId, setNavFlyoutDepartmentId] = useState<string | null>(null);
  const [navFlyoutModuleStack, setNavFlyoutModuleStack] = useState<string[]>([]);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

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

  const closeNavFlyout = useCallback(() => {
    setNavFlyoutOpen(false);
    setNavFlyoutDepartmentId(null);
    setNavFlyoutModuleStack([]);
  }, []);

  const openNavFlyout = useCallback((departmentId: string) => {
    setNavFlyoutDepartmentId(departmentId);
    setNavFlyoutModuleStack([]);
    setNavFlyoutOpen(true);
  }, []);

  const pushNavFlyoutModule = useCallback((moduleId: string) => {
    setNavFlyoutModuleStack((prev) => [...prev, moduleId]);
  }, []);

  const popNavFlyoutModule = useCallback(() => {
    setNavFlyoutModuleStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
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
        navFlyoutOpen,
        navFlyoutDepartmentId,
        navFlyoutModuleStack,
        openNavFlyout,
        pushNavFlyoutModule,
        popNavFlyoutModule,
        closeNavFlyout,
        globalSearchOpen,
        setGlobalSearchOpen,
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
