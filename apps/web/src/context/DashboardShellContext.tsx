"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface DashboardShellContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  onNavClick: () => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

function isMobileNav(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function DashboardShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      value={{ sidebarOpen, toggleSidebar, closeSidebar, onNavClick }}
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
