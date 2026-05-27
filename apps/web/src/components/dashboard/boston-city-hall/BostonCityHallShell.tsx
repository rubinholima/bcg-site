"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, ContactRound, Kanban, LayoutDashboard } from "lucide-react";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { DEPT_HUB_MENU_LABEL } from "@/lib/dashboard-labels";
import { cn } from "@/lib/utils";

const BCH_BASE = "/dashboard/eventos/boston-city-hall";

const NAV = [
  { href: BCH_BASE, label: DEPT_HUB_MENU_LABEL, icon: LayoutDashboard, exact: true as const },
  { href: `${BCH_BASE}/agenda`, label: "Agenda", icon: CalendarDays },
  { href: `${BCH_BASE}/crm`, label: "CRM", icon: ContactRound },
  { href: `${BCH_BASE}/reservas`, label: "Reservas", icon: ClipboardList },
  { href: `${BCH_BASE}/pipeline`, label: "Pipeline", icon: Kanban },
] as const;

export function BostonCityHallShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/eventos"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Depto de Eventos
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BostonCityHallLogo size="lg" className="ring-1 ring-border rounded-full" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const active =
            "exact" in item && item.exact
              ? pathname === href
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

      {children}
    </div>
  );
}
