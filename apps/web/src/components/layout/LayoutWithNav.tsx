"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Home } from "lucide-react";
import { fetchGroup } from "@/lib/home-data";

/** Páginas públicas que usam a navbar do portal. "/" (home) tem navbar própria e não entra aqui. */
const PORTAL_NAV_PATHS = ["/login", "/403"] as const;

export function LayoutWithNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const showPortalNav =
    pathname != null &&
    (PORTAL_NAV_PATHS as readonly string[]).includes(pathname);
  const [group, setGroup] = useState<Awaited<ReturnType<typeof fetchGroup>>>(null);

  useEffect(() => {
    if (!showPortalNav) return;
    fetchGroup().then(setGroup);
  }, [showPortalNav]);

  return (
    <>
      {showPortalNav && (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
          <div className="container flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <img
                src="/bcg-logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain flex-shrink-0 rounded"
              />
              <span>{group?.name ?? "Boston City Group"}</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Home className="h-4 w-4" />
                Início
              </Link>
              <PortalDashboardLink />
              <LoginLink isLogin={isLogin} />
            </nav>
          </div>
        </header>
      )}
      {children}
    </>
  );
}

function PortalDashboardLink() {
  const { canAccessDashboard, loading } = useAuth();
  if (loading || !canAccessDashboard) return null;
  return (
    <Link
      href="/dashboard"
      className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
    >
      <LayoutDashboard className="h-4 w-4" />
      Dashboard
    </Link>
  );
}

function LoginLink({ isLogin }: { isLogin: boolean }) {
  const { user, loading } = useAuth();
  if (loading || isLogin || user) return null;
  return (
    <Link
      href="/login"
      className="text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      Entrar
    </Link>
  );
}
