"use client";

import { useLayoutEffect } from "react";

/**
 * Bloqueia o scroll do html/body quando o dashboard está ativo.
 * Aplica antes do paint para evitar flash de segunda scrollbar.
 */
export function DashboardBodyLock() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("dashboard-active");
    document.body.classList.add("dashboard-active");
    return () => {
      document.documentElement.classList.remove("dashboard-active");
      document.body.classList.remove("dashboard-active");
    };
  }, []);
  return null;
}
