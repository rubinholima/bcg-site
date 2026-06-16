"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Home } from "lucide-react";
import { fetchGroup } from "@/lib/home-data";

/** Páginas públicas que usam a navbar do portal (403). Login não exibe menu — entrada direta no app. */
const PORTAL_NAV_PATHS = ["/403"] as const;

export function LayoutWithNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-16">
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
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
      )}
      {children}
    </>
  );
}
