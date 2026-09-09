"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { resolveDashboardPageMeta } from "@/lib/dashboard-page-meta";

const SESSION_STORAGE_KEY = "bcg-cup360-session";
const HEARTBEAT_MS = 30_000;

function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") return "ssr";
  let key = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, key);
  }
  return key;
}

function inferTenantContext(
  pathname: string,
  isSuperAdmin: boolean,
  tenantIds: string[] | null,
): { tenantId?: string; tenantLabel?: string } {
  if (isSuperAdmin) return { tenantLabel: "Grupo Master" };
  const companyMatch = pathname.match(/\/dashboard\/empresas\/([^/]+)/);
  if (companyMatch?.[1] && companyMatch[1] !== "new") {
    return { tenantId: companyMatch[1] };
  }
  if (tenantIds?.length === 1) return { tenantId: tenantIds[0] };
  return {};
}

export function useDashboardPresence() {
  const pathname = usePathname() ?? "";
  const { canAccessDashboard, loading, isSuperAdmin, tenantIds } = useAuth();
  const isActiveRef = useRef(true);
  const lastActivityPingRef = useRef(0);

  const markActive = useCallback(() => {
    isActiveRef.current = true;
    lastActivityPingRef.current = Date.now();
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!canAccessDashboard) return;
    const meta = resolveDashboardPageMeta(pathname);
    const tenantCtx = inferTenantContext(pathname, isSuperAdmin, tenantIds);
    const recentlyActive = Date.now() - lastActivityPingRef.current <= 120_000;
    try {
      await authFetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: getOrCreateSessionKey(),
          currentPath: pathname,
          currentModule: meta?.section ?? null,
          currentPageTitle: meta?.title ?? null,
          tenantId: tenantCtx.tenantId,
          tenantLabel: tenantCtx.tenantLabel,
          isActive: recentlyActive && isActiveRef.current,
        }),
      });
    } catch {
      /* silencioso — presença é best-effort */
    }
    isActiveRef.current = false;
  }, [canAccessDashboard, isSuperAdmin, pathname, tenantIds]);

  useEffect(() => {
    if (loading || !canAccessDashboard) return;
    markActive();
    void sendHeartbeat();
    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [loading, canAccessDashboard, sendHeartbeat, markActive]);

  useEffect(() => {
    if (loading || !canAccessDashboard) return;
    markActive();
    void sendHeartbeat();
  }, [pathname, loading, canAccessDashboard, sendHeartbeat, markActive]);

  useEffect(() => {
    if (loading || !canAccessDashboard) return;
    const onActivity = () => markActive();
    const onVisibility = () => {
      if (document.visibilityState === "visible") markActive();
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loading, canAccessDashboard, markActive]);
}
