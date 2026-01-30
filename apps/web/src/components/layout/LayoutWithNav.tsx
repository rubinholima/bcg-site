"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Building2, LayoutDashboard, Home } from "lucide-react";

const publicPaths = ["/", "/403"];

export function LayoutWithNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname && publicPaths.includes(pathname);
  const isDashboard = pathname?.startsWith("/dashboard");
  const isLogin = pathname === "/login";
  const showPortalNav = isPublic || isLogin;

  return (
    <>
      {showPortalNav && (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
          <div className="container flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span>Boston City Group</span>
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
