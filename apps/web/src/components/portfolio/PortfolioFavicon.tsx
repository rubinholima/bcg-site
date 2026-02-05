"use client";

import { useEffect, useRef } from "react";

const FAVICON_ID = "portfolio-favicon";

/**
 * Favicon do portfólio: SEMPRE o logo do tenant. Usa URL estável /api/portfolio/[slug]/favicon
 * e reforça no cliente para nunca ser trocado (visibilitychange + observer).
 */
export function PortfolioFavicon({
  slug,
  logoUrl,
}: {
  slug: string | null | undefined;
  logoUrl?: string | null;
}) {
  const hrefRef = useRef<string>("");

  useEffect(() => {
    const href = slug?.trim()
      ? `/api/portfolio/${encodeURIComponent(slug)}/favicon`
      : "";
    if (!href) return;
    hrefRef.current = href;

    const apply = () => {
      let link = document.getElementById(FAVICON_ID) as HTMLLinkElement | null;
      if (!link) {
        link = document.querySelector<HTMLLinkElement>(`link[rel="icon"]`);
        if (link) {
          link.id = FAVICON_ID;
        } else {
          link = document.createElement("link");
          link.id = FAVICON_ID;
          link.rel = "icon";
          document.head.appendChild(link);
        }
      }
      if (link.href !== href) {
        link.href = href;
      }
    };

    apply();

    const onVisibility = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new MutationObserver(() => {
      const link = document.getElementById(FAVICON_ID) as HTMLLinkElement | null;
      const current = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!current || current.href !== hrefRef.current) {
        apply();
      }
    });
    observer.observe(document.head, { childList: true, attributes: true, attributeFilter: ["href"] });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, [slug]);

  return null;
}
