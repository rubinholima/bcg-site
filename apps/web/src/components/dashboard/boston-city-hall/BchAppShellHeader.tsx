"use client";

import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resolveBchAppSectionLabel } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BchAppShellHeader({
  pathname,
  eventName,
  onToggleNav,
  navOpen,
}: {
  pathname: string;
  eventName?: string | null;
  onToggleNav?: () => void;
  navOpen?: boolean;
}) {
  const { user } = useAuth();
  const section = resolveBchAppSectionLabel(pathname);
  const displayUser = user?.name?.trim() || user?.email || "Usuário";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex min-h-[56px] shrink-0 items-center gap-3 border-b border-slate-800/90",
        "bg-[#070b12]/95 px-3 backdrop-blur-md sm:px-5",
      )}
    >
      {onToggleNav ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-slate-300 lg:hidden"
          onClick={onToggleNav}
          aria-expanded={navOpen}
          aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold tracking-tight text-slate-50">
            Boston City Hall
          </span>
          <span className="hidden text-slate-600 sm:inline" aria-hidden>
            ·
          </span>
          <span className="truncate text-sm text-sky-300/90">{section}</span>
        </div>
        {eventName ? (
          <p className="truncate text-xs text-amber-200/90 sm:border-l sm:border-slate-700 sm:pl-4">
            {bchEventDisplayName(eventName)}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-10 w-10 border-slate-700 bg-slate-900/50 text-slate-200 sm:hidden"
        >
          <Link href="/dashboard/eventos" aria-label="Voltar ao CUP360">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden min-h-[40px] border-slate-700 bg-slate-900/50 text-slate-200 sm:inline-flex"
        >
          <Link href="/dashboard/eventos">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            CUP360
          </Link>
        </Button>
        <span className="max-w-[8rem] truncate rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 sm:max-w-[12rem]">
          {displayUser}
        </span>
      </div>
    </header>
  );
}
