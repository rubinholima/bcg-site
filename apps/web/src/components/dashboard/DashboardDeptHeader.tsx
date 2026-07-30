"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { dash } from "@/lib/dashboard-theme-classes";
import {
  type DashboardAccent,
  dashboardStatToneClass,
  getDashboardAccentStyles,
} from "@/lib/dashboard-accent";

/** Stat no canto superior direito — hubs e resumos. */
export type DashboardDeptStat = {
  value: React.ReactNode;
  label: string;
};

type DashboardDeptHeaderProps = {
  section: string;
  sectionIcon?: LucideIcon;
  /** Ícone só pode ser passado de outro Client Component — nunca de Server Component (RSC). */
  title: string;
  description?: string;
  stats?: DashboardDeptStat[];
  toolbar?: React.ReactNode;
  aside?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  leading?: React.ReactNode;
  titleClassName?: string;
  descriptionAside?: React.ReactNode;
  footerAside?: React.ReactNode;
  compact?: boolean;
  /** standard = listas/formulários (Relatórios, Patrimônio); hero = hub com card gradiente */
  variant?: "standard" | "hero";
  accent?: DashboardAccent;
};

/**
 * Cabeçalho padrão do dashboard — todas as páginas devem usar via DashboardPageFrame
 * ou explicitamente com variant="standard" (padrão global).
 */
export function DashboardDeptHeader({
  section,
  sectionIcon: SectionIcon = Sparkles,
  title,
  description,
  stats,
  toolbar,
  aside,
  backHref,
  backLabel = "Voltar",
  className,
  leading,
  titleClassName,
  descriptionAside,
  footerAside,
  compact = false,
  variant = "standard",
  accent = "violet",
}: DashboardDeptHeaderProps) {
  const styles = getDashboardAccentStyles(accent);

  if (variant === "standard" && !leading && !descriptionAside && !footerAside && !compact) {
    return (
      <header data-dashboard-dept-header className={cn("space-y-4", className)}>
        {backHref ? (
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 px-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.16em]",
                styles.sectionLabel,
              )}
            >
              {section}
            </p>
            <h1
              className={cn(
                "mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight",
                titleClassName,
              )}
            >
              <SectionIcon className={cn("h-6 w-6 shrink-0", styles.icon)} />
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="flex flex-wrap gap-2">{aside}</div> : null}
        </div>
        {stats && stats.length > 0 ? (
          <DashboardStatGrid
            items={stats.map((s) => ({ label: s.label, value: s.value }))}
          />
        ) : null}
        {toolbar ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div> : null}
      </header>
    );
  }

  return (
    <div
      data-dashboard-dept-header
      className={cn(styles.heroCard, "p-7 sm:p-9", className)}
    >
      {backHref ? (
        <div className={compact ? "mb-2" : "mb-4"}>
          <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      ) : null}
      {leading && compact ? (
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0">{leading}</div>
          <div className="min-w-0 flex-1">
            <p className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]", styles.sectionLabel)}>
              <SectionIcon className="h-3.5 w-3.5 shrink-0" />
              {section}
            </p>
            <h1 className={cn("mt-0.5 text-xl font-bold leading-snug tracking-tight sm:text-2xl", titleClassName)}>
              {title}
            </h1>
            {description || descriptionAside ? (
              <div className="mt-0.5 flex items-center justify-between gap-3">
                {description ? (
                  <p className="min-w-0 truncate text-sm leading-none text-muted-foreground">{description}</p>
                ) : (
                  <span className="flex-1" />
                )}
                {descriptionAside ? <div className="shrink-0">{descriptionAside}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : leading && descriptionAside ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="mx-auto shrink-0 sm:mx-0">{leading}</div>
            <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
              <p className={cn("flex items-center justify-center gap-2.5 text-sm font-semibold uppercase tracking-[0.18em] sm:justify-start", styles.sectionLabel)}>
                <SectionIcon className="h-4 w-4 shrink-0" />
                {section}
              </p>
              <h1 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", titleClassName)}>{title}</h1>
            </div>
          </div>
          <div className="mt-4 flex flex-row items-center justify-between gap-4 sm:mt-5 sm:pl-[calc(8rem+1.25rem)]">
            {description ? (
              <p className="min-w-0 flex-1 text-base leading-relaxed text-muted-foreground">{description}</p>
            ) : (
              <span className="flex-1" />
            )}
            <div className="shrink-0">{descriptionAside}</div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            {leading ? <div className="mx-auto shrink-0 sm:mx-0">{leading}</div> : null}
            <div className="mx-auto w-full max-w-3xl space-y-4 text-center sm:mx-0 sm:flex-1 sm:text-left">
              <p className={cn("flex items-center justify-center gap-2.5 text-sm font-semibold uppercase tracking-[0.18em] sm:justify-start", styles.sectionLabel)}>
                <SectionIcon className="h-4 w-4 shrink-0" />
                {section}
              </p>
              <h1 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", titleClassName)}>{title}</h1>
              {description || descriptionAside ? (
                <div
                  className={cn(
                    "mx-auto w-full sm:mx-0",
                    description && descriptionAside
                      ? "flex flex-row items-center justify-between gap-4"
                      : undefined,
                  )}
                >
                  {description ? (
                    <p className="min-w-0 flex-1 text-base leading-relaxed text-muted-foreground">{description}</p>
                  ) : null}
                  {descriptionAside ? <div className="shrink-0">{descriptionAside}</div> : null}
                </div>
              ) : null}
            </div>
          </div>
          {stats && stats.length > 0 ? (
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn("flex flex-col items-center justify-center rounded-xl px-3 py-2 text-center", dash.statChip)}
                >
                  <p className="text-lg font-bold tabular-nums leading-none">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase leading-tight text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : aside ? (
            <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">{aside}</div>
          ) : null}
        </div>
      )}
      {toolbar ? (
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div>
      ) : null}
      {footerAside ? (
        <div className={cn("flex justify-end", compact ? "mt-2" : "mt-6")}>{footerAside}</div>
      ) : null}
    </div>
  );
}

export function DashboardDeptShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex max-w-6xl flex-col space-y-6", className)}>{children}</div>;
}

/** Cards de resumo — 4 itens em linha única no desktop; demais layouts em 3 colunas. */
export function DashboardStatGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode; tone?: "emerald" | "sky" | "amber" | "violet" | "rose" | "slate" }>;
}) {
  const tones: Array<"emerald" | "sky" | "amber" | "violet"> = ["emerald", "sky", "amber", "violet"];
  const gridClass =
    items.length === 4
      ? "grid gap-3 grid-cols-2 sm:grid-cols-4"
      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={gridClass}>
      {items.map((item, i) => {
        const tone = item.tone ?? tones[i % tones.length] ?? "violet";
        return (
          <div
            key={item.label}
            className={cn("rounded-xl border px-4 py-3", dashboardStatToneClass(tone))}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Bloco de filtros com destaque da cor do módulo. */
export function DashboardFilterBox({
  accent = "violet",
  children,
  className,
}: {
  accent?: DashboardAccent;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = getDashboardAccentStyles(accent);
  return (
    <div className={cn("grid gap-4 rounded-xl border p-4", styles.filterBox, className)}>{children}</div>
  );
}

/** Label de filtro/campo no padrão global. */
export function DashboardFieldLabel({
  children,
  htmlFor,
  accent = "violet",
}: {
  children: React.ReactNode;
  htmlFor?: string;
  accent?: DashboardAccent;
}) {
  const styles = getDashboardAccentStyles(accent);
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-xs font-semibold uppercase tracking-[0.12em]", styles.sectionLabel)}
    >
      {children}
    </label>
  );
}

/** Linha de lista clicável — padrão Relatórios semanais. */
export function DashboardListRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-[56px] w-full flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        onClick && "transition-colors hover:bg-muted/20",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** Box de conteúdo abaixo do header. */
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
        "overflow-hidden rounded-2xl border border-border/80 bg-card/40",
        className,
      )}
    >
      {title || description || aside ? (
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0 space-y-4 p-5 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}

/** Banner no topo de formulários/dialogs. */
export function DashboardFormHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accent = "violet",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: DashboardAccent;
}) {
  const styles = getDashboardAccentStyles(accent);
  return (
    <div className={cn("rounded-2xl border p-5 sm:p-6", styles.heroCard)}>
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", styles.sectionLabel)}>
        {eyebrow}
      </p>
      <div className="mt-2 flex items-start gap-3">
        {Icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/50",
              styles.filterBox,
            )}
          >
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Seção de formulário com barra lateral colorida. */
export function DashboardFormSection({
  title,
  children,
  highlight = false,
  accent = "violet",
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  accent?: DashboardAccent;
}) {
  const styles = getDashboardAccentStyles(accent);
  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border p-5 sm:p-6",
        highlight ? styles.formHighlight : "border-border/70 bg-card/30",
      )}
    >
      <h3
        className={cn(
          "border-l-4 pl-3 text-xs font-bold uppercase tracking-[0.16em]",
          styles.sectionBorder,
          styles.formSectionTitle,
        )}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Shell de dialog full-height — padrão Relatórios / Patrimônio. */
export function DashboardDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6", className)}>{children}</div>
  );
}

export function DashboardDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap gap-2 border-t border-border/60 px-6 py-4 sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Busca padrão do dashboard. */
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="min-h-[44px] pl-9 text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

/** Abas pill. */
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
    <div className="flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/30 p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none sm:justify-start",
            active === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60",
          )}
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function DashboardDeptToolbarAside({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** Estado vazio centralizado. */
export function DashboardEmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Loading inline. */
export function DashboardLoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{label}</p>
  );
}
