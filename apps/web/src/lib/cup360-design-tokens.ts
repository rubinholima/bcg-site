/**
 * Tokens visuais CUP360 v1 — sidebar 232/68px, densidade compacta.
 */
import { cn } from "@/lib/utils";

export const cup360 = {
  layout: {
    sidebarOpen: "w-[232px]",
    sidebarCollapsed: "w-[68px]",
    sidebarOpenPx: 232,
    sidebarCollapsedPx: 68,
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
    areaLabel: "cup360-sidebar-area-label",
    areaToggle:
      "flex h-[30px] w-full items-center gap-1 px-1.5 text-left transition-colors hover:text-foreground",
    moduleList: "ml-1 space-y-0.5 border-l border-border/40 pl-1.5",
    screenList: "ml-1 space-y-0.5 border-l border-border/30 pl-1.5",
    linkL1:
      "flex shrink-0 items-center gap-2 rounded-md px-2 text-[13px] font-semibold transition-colors duration-150",
    linkL2:
      "flex items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors duration-150",
    linkL3:
      "flex items-center gap-1.5 rounded-md px-2 text-xs font-normal transition-colors duration-150",
    executiveLink:
      "mb-1 flex shrink-0 items-center gap-2 rounded-md border border-violet-500/20 bg-violet-500/5 px-2 text-[13px] font-semibold transition-colors duration-150 dark:border-violet-500/25 dark:bg-violet-500/10",
    iconL1: "h-[18px] w-[18px]",
    iconL2: "h-4 w-4",
    active: "dashboard-sidebar-active",
    activeSoft: "bg-muted/40 text-foreground",
    idle: "text-muted-foreground hover:bg-accent/60 hover:text-foreground cup360-sidebar-hover",
    flyout:
      "cup360-sidebar-flyout absolute left-[calc(100%+4px)] top-0 z-[60] min-w-[196px] max-w-[220px] rounded-lg border border-border/70 bg-popover py-1.5 shadow-lg",
    flyoutTitle:
      "px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
    flyoutModule:
      "px-2.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80",
    flyoutLink:
      "flex h-[30px] items-center rounded-md px-2.5 text-[13px] transition-colors duration-150",
    flyoutScroll: "max-h-[min(70vh,420px)] overflow-y-auto",
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
