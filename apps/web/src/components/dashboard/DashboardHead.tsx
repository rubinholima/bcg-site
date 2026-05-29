"use client";

import { useEffect } from "react";
import { PLATFORM_APP_NAME, PLATFORM_LOGO_SRC } from "@/lib/platform-branding";

/**
 * Título e favicon da plataforma no dashboard (CUP360).
 */
export function DashboardHead() {
  useEffect(() => {
    const title = `Dashboard · ${PLATFORM_APP_NAME}`;
    if (document.title !== title) {
      document.title = title;
    }
  }, []);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dashboard-favicon]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-dashboard-favicon", "true");
      document.head.appendChild(link);
    }
    link.href = PLATFORM_LOGO_SRC;
    return () => {
      const el = document.querySelector('link[rel="icon"][data-dashboard-favicon]');
      if (el) el.remove();
    };
  }, []);

  return null;
}
