"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { getPublicImageUrl } from "@/lib/media-url";
import { PLATFORM_LOGO_SRC } from "@/lib/platform-branding";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface TenantLogoItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

function logoSizeClass(count: number): string {
  if (count <= 1) return "max-h-[min(26vh,160px)] max-w-[min(14vw,140px)]";
  if (count === 2) return "max-h-[min(20vh,130px)] max-w-[min(12vw,120px)]";
  if (count <= 4) return "max-h-[min(16vh,100px)] max-w-[min(10vw,100px)]";
  return "max-h-[min(12vh,80px)] max-w-[min(9vw,88px)]";
}

/**
 * Coluna esquerda do dashboard — logos das empresas/clubes do usuário (marca d'água).
 * Super admin: só CUP360.
 */
export function TenantWorkspaceRail() {
  const { isSuperAdmin, loading, canAccessDashboard } = useAuth();
  const [tenants, setTenants] = useState<TenantLogoItem[]>([]);

  useEffect(() => {
    if (loading || !canAccessDashboard || isSuperAdmin) {
      setTenants([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/tenants");
        if (!res.ok || cancelled) return;
        const list = (await res.json()) as TenantLogoItem[];
        if (!Array.isArray(list) || cancelled) return;
        setTenants(
          list
            .filter((t) => t.logoUrl?.trim())
            .map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl })),
        );
      } catch {
        if (!cancelled) setTenants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, canAccessDashboard, isSuperAdmin]);

  const items = useMemo(() => {
    if (isSuperAdmin) {
      return [{ id: "cup360", name: "CUP360", logoUrl: PLATFORM_LOGO_SRC }];
    }
    return tenants;
  }, [isSuperAdmin, tenants]);

  if (loading || !canAccessDashboard || items.length === 0) {
    return <div className="hidden shrink-0 xl:block xl:w-0" aria-hidden />;
  }

  const sizeClass = logoSizeClass(items.length);

  return (
    <aside
      className="pointer-events-none hidden min-h-0 w-[min(18vw,220px)] shrink-0 flex-col items-center justify-center gap-[clamp(0.5rem,2vh,1.25rem)] self-stretch border-r border-border/15 px-2 py-6 xl:flex"
      aria-label="Empresas com acesso"
    >
      {items.map((t) => {
        const src = t.id === "cup360" ? PLATFORM_LOGO_SRC : getPublicImageUrl(t.logoUrl!);
        return (
          <div
            key={t.id}
            className={cn(
              "flex w-full max-h-full flex-1 items-center justify-center",
              items.length > 1 && "min-h-0",
            )}
          >
            <img
              src={src}
              alt=""
              title={t.name}
              className={cn(
                "h-auto w-auto object-contain opacity-[0.28] saturate-[0.85] dark:opacity-[0.26]",
                sizeClass,
              )}
            />
          </div>
        );
      })}
    </aside>
  );
}

/** @deprecated use TenantWorkspaceRail */
export const TenantWorkspaceBackdrop = TenantWorkspaceRail;
