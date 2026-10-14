"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BCH_APP_DESTINATIONS,
  isBchAppDestinationActive,
} from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_LOGO_STATIC } from "@/lib/boston-city-hall";
import { cn } from "@/lib/utils";

export function BchAppShellNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Navegação Boston City Hall" className="flex h-full min-h-0 flex-col">
      <Link
        href={BCH_BASE}
        onClick={onNavigate}
        className="flex shrink-0 flex-col items-center border-b border-slate-800/90 px-4 py-5 transition-colors hover:bg-slate-900/30"
      >
        <img
          src={BCH_LOGO_STATIC}
          alt="Boston City Hall"
          className="h-auto w-full max-w-[9.5rem] object-contain"
        />
        <span className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-amber-500/85">
          BOSTON CITY HALL
        </span>
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Operação
        </p>
        <ul className="space-y-0.5">
          {BCH_APP_DESTINATIONS.map((dest) => {
            const active = isBchAppDestinationActive(pathname, dest);
            const Icon = dest.icon;
            return (
              <li key={dest.id}>
                <Link
                  href={dest.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/35"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{dest.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
