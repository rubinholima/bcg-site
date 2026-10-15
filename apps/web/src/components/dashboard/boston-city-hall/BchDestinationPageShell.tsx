"use client";

import { BchPageHeader } from "@/components/dashboard/boston-city-hall/BchPageHeader";
import { BchPageShell } from "@/components/dashboard/boston-city-hall/BchPageShell";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { cn } from "@/lib/utils";

type Crumb = { href?: string; label: string };

export function BchDestinationPageShell({
  title,
  breadcrumbs,
  actions,
  subNav,
  lead,
  children,
  className,
}: {
  title: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  subNav?: React.ReactNode;
  /** Linha curta abaixo do header (data, contexto operacional). */
  lead?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const crumbs: Crumb[] = breadcrumbs ?? [
    { href: BCH_BASE, label: "Boston City Hall" },
    { label: title },
  ];

  return (
    <BchPageShell className={cn("space-y-4", className)}>
      <BchPageHeader title={title} breadcrumbs={crumbs} actions={actions} />
      {lead ? <div className="space-y-1 text-sm text-slate-400">{lead}</div> : null}
      {subNav}
      {children}
    </BchPageShell>
  );
}
