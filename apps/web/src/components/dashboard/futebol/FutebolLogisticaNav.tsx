"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "/dashboard/futebol/logistica";

const TABS = [
  { href: `${BASE}/agenda`, label: "Agenda", icon: CalendarDays },
  { href: BASE, label: "Viagens", icon: Map, exact: true as const },
] as const;

export function FutebolLogisticaNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
      {TABS.map((tab) => {
        const { href, label, icon: Icon } = tab;
        const active =
          "exact" in tab && tab.exact
            ? pathname === href ||
              (pathname.startsWith(`${BASE}/`) && !pathname.startsWith(`${BASE}/agenda`))
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
