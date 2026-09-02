"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";
import {
  buildCup360NavV3,
  collectAllPresentationScreens,
} from "@/lib/cup360-nav-build";
import {
  filterAuthorizedSearchResults,
  searchCup360Navigation,
} from "@/lib/cup360-nav-search";
import { getDashboardHomeMenuItem } from "@/lib/dashboard-home";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cup360 } from "@/lib/cup360-design-tokens";

export function Cup360GlobalSearchTrigger({ className }: { className?: string }) {
  const { setGlobalSearchOpen } = useDashboardShell();

  return (
    <button
      type="button"
      onClick={() => setGlobalSearchOpen(true)}
      className={cn(cup360.sidebar.searchTrigger, className)}
    >
      <Search className="h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">Buscar no sistema…</span>
      <kbd className={cup360.sidebar.searchKbd}>Ctrl K</kbd>
    </button>
  );
}

export function Cup360GlobalSearchDialog() {
  const router = useRouter();
  const { globalSearchOpen, setGlobalSearchOpen, onNavClick, closeNavFlyout } =
    useDashboardShell();
  const { canAccessModule, canAccessDashboard, role, modules, isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");

  const homeMenu = getDashboardHomeMenuItem(role, modules);

  const nav = useMemo(
    () =>
      buildCup360NavV3(canAccessModule, canAccessDashboard, isSuperAdmin, {
        includeMaster: canAccessDashboard,
        masterHref: homeMenu.href,
        masterLabel: homeMenu.label,
      }),
    [canAccessModule, canAccessDashboard, isSuperAdmin, homeMenu.href, homeMenu.label],
  );

  const authorizedHrefs = useMemo(
    () => new Set(collectAllPresentationScreens(nav).map((s) => s.href)),
    [nav],
  );

  const results = useMemo(() => {
    const raw = searchCup360Navigation(nav, query, 16);
    return filterAuthorizedSearchResults(raw, authorizedHrefs);
  }, [nav, query, authorizedHrefs]);

  const openSearch = useCallback(() => setGlobalSearchOpen(true), [setGlobalSearchOpen]);
  const closeSearch = useCallback(() => {
    setGlobalSearchOpen(false);
    setQuery("");
  }, [setGlobalSearchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape" && globalSearchOpen) {
        closeSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch, closeSearch, globalSearchOpen]);

  const handleSelect = (href: string) => {
    closeSearch();
    closeNavFlyout();
    onNavClick();
    router.push(href);
  };

  return (
    <Dialog open={globalSearchOpen} onOpenChange={(open) => (open ? openSearch() : closeSearch())}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="sr-only">Buscar no sistema</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar módulos e telas…"
              className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </DialogHeader>
        <ul className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
          {query.trim() && results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum destino encontrado.
            </li>
          ) : null}
          {results.map((result) => (
            <li key={result.href}>
              <button
                type="button"
                onClick={() => handleSelect(result.href)}
                className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-violet-500/10"
              >
                <span className="text-sm font-medium text-foreground">{result.label}</span>
                <span className="text-xs text-muted-foreground">{result.context}</span>
              </button>
            </li>
          ))}
          {!query.trim() ? (
            <li className="px-4 py-3 text-xs text-muted-foreground">
              Digite para buscar telas autorizadas (ex.: atletas, logística, psicologia).
            </li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
