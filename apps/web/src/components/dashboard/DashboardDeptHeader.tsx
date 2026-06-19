"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Stat no canto superior direito — igual Construção Web. */
export type DashboardDeptStat = {
  value: React.ReactNode;
  label: string;
};

/** Header de departamento — markup idêntico ao hub de Páginas / Construção Web. */
export function DashboardDeptHeader({
  section,
  sectionIcon: SectionIcon = Sparkles,
  title,
  description,
  stats,
  toolbar,
  aside,
  backHref,
  className,
  leading,
  titleClassName,
}: {
  section: string;
  sectionIcon?: LucideIcon;
  title: string;
  description?: string;
  stats?: DashboardDeptStat[];
  toolbar?: React.ReactNode;
  /** Ações no canto superior direito (ex.: botão Salvar) quando não há stats. */
  aside?: React.ReactNode;
  backHref?: string;
  className?: string;
  /** Avatar ou mídia à esquerda do título (ex.: foto do atleta) */
  leading?: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div
      data-dashboard-dept-header
      className={cn(
        "rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-background to-background p-7 sm:p-9",
        className,
      )}
    >
      {backHref ? (
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="-ml-2 h-9 gap-1.5 px-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          {leading ? <div className="mx-auto shrink-0 sm:mx-0">{leading}</div> : null}
          <div className="mx-auto w-full max-w-3xl space-y-4 text-center sm:mx-0 sm:flex-1 sm:text-left">
          <p className="flex items-center justify-center gap-2.5 text-sm font-semibold uppercase tracking-[0.18em] text-violet-400 sm:justify-start">
            <SectionIcon className="h-4 w-4 shrink-0" />
            {section}
          </p>
          <h1 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", titleClassName)}>{title}</h1>
          {description ? (
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:mx-0">
              {description}
            </p>
          ) : null}
          </div>
        </div>
        {stats && stats.length > 0 ? (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-center"
              >
                <p className="text-lg font-bold tabular-nums leading-none">{stat.value}</p>
                <p className="mt-1 text-[10px] uppercase leading-tight text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : aside ? (
          <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">{aside}</div>
        ) : null}
      </div>
      {toolbar ? (
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div>
      ) : null}
    </div>
  );
}

export function DashboardDeptShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-6xl space-y-6", className)}>{children}</div>;
}

/** Box de conteúdo abaixo do header — padrão Mídia / departamentos. */
export function DashboardDeptSection({
  title,
  description,
  aside,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6",
        className,
      )}
    >
      {title || description || aside ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0 space-y-4", contentClassName)}>{children}</div>
    </section>
  );
}

/** Busca na linha de filtros — igual Construção Web. */
export function DashboardDeptSearch({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="min-h-[44px] pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

/** Abas pill na linha de filtros — igual Construção Web. */
export function DashboardDeptTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon?: LucideIcon }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            active === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

/** Conteúdo à direita da busca (select, botões) — mesma altura das abas. */
export function DashboardDeptToolbarAside({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
