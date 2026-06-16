"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { getPublicImageUrl } from "@/lib/media-url";
import { PLATFORM_LOGO_MARK_SRC } from "@/lib/platform-branding";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface TenantLogoItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

function logoSizeClass(count: number): string {
  if (count <= 1) return "max-h-[min(13vh,72px)] max-w-[min(8vw,88px)]";
  if (count === 2) return "max-h-[min(10vh,60px)] max-w-[min(7vw,72px)]";
  if (count <= 4) return "max-h-[min(8vh,48px)] max-w-[min(6vw,60px)]";
  return "max-h-[min(6vh,40px)] max-w-[min(5vw,52px)]";
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
      return [{ id: "cup360", name: "CUP360", logoUrl: PLATFORM_LOGO_MARK_SRC }];
    }
    return tenants;
  }, [isSuperAdmin, tenants]);

  if (loading || !canAccessDashboard || items.length === 0) {
    return <div className="hidden shrink-0 xl:block xl:w-0" aria-hidden />;
  }

  const sizeClass = logoSizeClass(items.length);

  return (
    <aside
      className="pointer-events-none hidden min-h-0 w-[min(12vw,120px)] shrink-0 flex-col items-start justify-start gap-3 self-stretch border-r border-border/15 px-2 pt-4 pb-6 xl:flex"
      aria-label="Empresas com acesso"
    >
      {items.map((t) => {
        const src = t.id === "cup360" ? PLATFORM_LOGO_MARK_SRC : getPublicImageUrl(t.logoUrl!);
        return (
          <div
            key={t.id}
            className={cn(
              "flex w-full shrink-0 items-start justify-start",
              items.length > 1 && "min-h-0",
            )}
          >
            <img
              src={src}
              alt=""
              title={t.name}
              className={cn(
                "h-auto w-auto object-contain object-left-top opacity-[0.32] saturate-[0.9] dark:opacity-[0.3]",
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
