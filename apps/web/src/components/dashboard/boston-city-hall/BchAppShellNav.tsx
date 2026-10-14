"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BCH_APP_DESTINATIONS,
  isBchAppDestinationActive,
} from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { cn } from "@/lib/utils";

export function BchAppShellNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Navegação Boston City Hall" className="flex flex-col gap-1 p-3">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
      <p className="mt-4 px-2 text-[10px] leading-snug text-slate-600">
        Acesso hoje via permissão <span className="text-slate-500">eventos</span>. Papéis operacionais
        finos entram na próxima fase.
      </p>
    </nav>
  );
}
