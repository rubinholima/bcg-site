"use client";

import { useEffect } from "react";
import { getPublicImageUrl } from "@/lib/media-url";

/**
 * Favicon: sempre o logo do clube/empresa. Nunca trocar por outro.
 * Usa proxy para S3 para carregar na aba.
 */
export function PortfolioFavicon({ logoUrl }: { logoUrl: string | null | undefined }) {
  useEffect(() => {
    if (!logoUrl || typeof logoUrl !== "string") return;
    const href = getPublicImageUrl(logoUrl) || logoUrl;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href !== href) {
      link.href = href;
    }
  }, [logoUrl]);
  return null;
}
