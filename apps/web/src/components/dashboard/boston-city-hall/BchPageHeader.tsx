"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { cn } from "@/lib/utils";

type Crumb = { href?: string; label: string };

export function BchPageHeader({
  title,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  breadcrumbs: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "rounded-xl border border-amber-500/15 bg-gradient-to-br from-slate-950/90 via-[#0c1222] to-slate-950/90 p-4 sm:p-5",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-400">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden /> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-amber-200/90">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-300">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BostonCityHallLogo size="md" className="ring-1 ring-amber-500/25 rounded-full shrink-0" />
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{title}</h1>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
