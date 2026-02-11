"use client";

import { useEffect } from "react";

/**
 * Bloqueia o scroll do body quando o dashboard está ativo.
 * Assim a scrollbar fica apenas na área de conteúdo, evitando corte à direita.
 */
export function DashboardBodyLock() {
  useEffect(() => {
    document.body.classList.add("dashboard-active");
    return () => {
      document.body.classList.remove("dashboard-active");
    };
  }, []);
  return null;
}
