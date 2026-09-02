/**
 * Tokens visuais CUP360 — sidebar v3 264/68px.
 */
import { cn } from "@/lib/utils";

export const cup360 = {
  layout: {
    sidebarOpen: "w-[264px]",
    sidebarCollapsed: "w-[68px]",
    sidebarOpenPx: 264,
    sidebarCollapsedPx: 68,
    headerHeightPx: 64,
    flyoutMinPx: 720,
    flyoutMaxPx: 880,
  },
  pageBg: "bg-background dashboard-main-bg",
  surface1: "rounded-xl border border-border/70 bg-card shadow-sm",
  surface2: "rounded-lg border border-border/60 bg-muted/20",
  borderSubtle: "border-border/60",
  accent: "text-violet-600 dark:text-violet-400",
  accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
  accentBorder: "border-violet-500/30 dark:border-violet-500/25",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-sky-600 dark:text-sky-400",
  textPrimary: "text-foreground",
  textSecondary: "text-muted-foreground",
  textMuted: "text-muted-foreground/70",
  radius: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  },
  gap: {
    section: "gap-6",
    card: "gap-4",
    control: "gap-2",
  },
  pad: {
    card: "p-4 sm:p-5",
    section: "px-0 py-4",
  },
  control: {
    heightSm: "h-8",
    heightMd: "h-9",
    heightLg: "h-10",
    iconSm: "h-4 w-4",
    iconMd: "h-[18px] w-[18px]",
  },
  type: {
    pageTitle: "text-xl font-semibold tracking-tight text-foreground",
    sectionTitle: "text-sm font-semibold text-foreground",
    sectionLabel: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
    body: "text-sm text-foreground",
    caption: "text-xs text-muted-foreground",
  },
  sidebar: {
    nav: "cup360-sidebar-nav flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2",
    rowGrid:
      "grid h-[42px] w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center rounded-lg px-1 text-left transition-colors duration-150",
    rowGridCollapsed:
      "flex h-[42px] w-full items-center justify-center rounded-lg transition-colors duration-150",
    standaloneTag:
      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400",
    labelPrimary: "truncate text-[14px] font-medium leading-none",
    labelSecondary: "truncate text-[12px] text-muted-foreground",
    sectionDivider: "my-2 border-t border-border/50",
    areaLabel: "px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70",
    systemLabel: "px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70",
    flyoutScrim:
      "cup360-flyout-scrim fixed bottom-0 right-0 z-[60] bg-black/30 backdrop-blur-[1px]",
    flyoutPanel:
      "cup360-nav-flyout fixed z-[61] flex flex-col overflow-hidden border-r border-border/80 bg-zinc-950/98 shadow-2xl backdrop-blur-md",
    flyoutHeader:
      "flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4",
    flyoutBody: "cup360-flyout-body min-h-0 flex-1 overflow-y-auto",
    flyoutTitle: "text-base font-semibold uppercase tracking-wide text-foreground",
    flyoutSubtitle: "mt-1 text-xs text-muted-foreground",
    flyoutBack:
      "mb-1.5 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-violet-400",
    flyoutGroupLabel:
      "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80",
    flyoutTile:
      "flex min-h-[52px] w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150",
    flyoutTileIdle: "border-border/50 bg-zinc-900/40 hover:border-violet-500/30 hover:bg-violet-500/10",
    flyoutTileActive: "border-violet-500/40 bg-violet-500/15 text-foreground",
    flyoutContextLink:
      "flex min-h-[36px] w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors duration-150",
    flyoutContextLinkIdle: "text-foreground/90 hover:bg-violet-500/10",
    flyoutTileIcon:
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-violet-400",
    searchTrigger:
      "hidden h-9 min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 text-sm text-muted-foreground transition-colors hover:border-violet-500/30 hover:bg-muted/30 md:flex lg:max-w-lg",
    searchKbd: "ml-auto hidden rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline",
    active: "dashboard-sidebar-active bg-violet-500/10 text-foreground",
    idle: "text-muted-foreground hover:bg-accent/60 hover:text-foreground cup360-sidebar-hover",
    iconL1: "h-[18px] w-[18px]",
  },
  shortcut: {
    base:
      "flex h-9 min-w-[5.5rem] max-w-[8.25rem] shrink-0 items-center gap-1.5 rounded-lg px-2 sm:h-10 sm:min-w-[6.25rem] sm:max-w-[9rem] sm:px-2.5",
    filled:
      "border border-violet-200 bg-violet-50 text-slate-900 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-950/30 dark:text-foreground dark:hover:border-violet-500/50 dark:hover:bg-violet-950/50",
    empty:
      "border border-dashed border-slate-300 text-slate-600 hover:border-violet-400 hover:bg-violet-50 hover:text-slate-900 dark:border-muted-foreground/35 dark:text-muted-foreground dark:hover:border-violet-500/40 dark:hover:bg-violet-950/20 dark:hover:text-foreground",
    icon: "text-violet-600 dark:text-violet-400",
    label: "min-w-0 truncate text-[11px] font-medium leading-tight sm:text-xs",
  },
  filterBar:
    "flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/50 p-3 sm:p-4",
  kpi: {
    card: "relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 shadow-sm",
    value: "text-2xl font-bold tabular-nums tracking-tight text-foreground",
    label: "text-xs font-medium text-muted-foreground",
  },
} as const;

export function cup360Cn(...parts: Array<string | false | null | undefined>) {
  return cn(...parts);
}
