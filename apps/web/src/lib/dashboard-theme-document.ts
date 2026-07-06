import type { DashboardResolvedTheme } from "@/context/DashboardThemeContext";

/** Aplica tema no documento — chamada síncrona ao trocar preferência. */
export function applyDashboardThemeToDocument(theme: DashboardResolvedTheme) {
  if (typeof document === "undefined") return;
  const isLight = theme === "light";
  const root = document.documentElement;
  root.classList.toggle("dark", !isLight);
  root.classList.toggle("dashboard-theme-light", isLight);
  root.setAttribute("data-dashboard-theme", theme);
}

/** Restaura escuro padrão ao sair do dashboard (site público). */
export function restorePublicSiteTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("dashboard-theme-light");
  root.removeAttribute("data-dashboard-theme");
}
