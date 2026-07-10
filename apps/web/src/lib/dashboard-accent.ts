import { cn } from "@/lib/utils";

/** Cor de destaque por área do dashboard (padrão Relatórios / Patrimônio). */
export type DashboardAccent =
  | "violet"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "slate";

const ACCENT_STYLES: Record<
  DashboardAccent,
  {
    icon: string;
    sectionLabel: string;
    sectionBorder: string;
    filterBox: string;
    statEmerald?: string;
    statSky?: string;
    statAmber?: string;
    heroCard: string;
    formHighlight: string;
    formSectionTitle: string;
  }
> = {
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    sectionLabel: "text-violet-700 dark:text-violet-400",
    sectionBorder: "border-violet-500",
    filterBox: "border-violet-500/20 bg-violet-500/5",
    heroCard:
      "border-violet-200/90 bg-gradient-to-br from-slate-50 via-white to-violet-50/60 dark:from-violet-950/40 dark:via-background dark:to-background",
    formHighlight: "border-violet-500/25 bg-violet-500/5",
    formSectionTitle: "text-violet-700 dark:text-violet-400",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    sectionLabel: "text-emerald-700 dark:text-emerald-400",
    sectionBorder: "border-emerald-500",
    filterBox: "border-emerald-500/20 bg-emerald-500/5",
    heroCard:
      "border-emerald-200/90 bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 dark:from-emerald-950/40 dark:via-background dark:to-background",
    formHighlight: "border-emerald-500/25 bg-emerald-500/5",
    formSectionTitle: "text-emerald-700 dark:text-emerald-400",
  },
  sky: {
    icon: "text-sky-600 dark:text-sky-400",
    sectionLabel: "text-sky-700 dark:text-sky-400",
    sectionBorder: "border-sky-500",
    filterBox: "border-sky-500/20 bg-sky-500/5",
    heroCard:
      "border-sky-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/60 dark:from-sky-950/40 dark:via-background dark:to-background",
    formHighlight: "border-sky-500/25 bg-sky-500/5",
    formSectionTitle: "text-sky-700 dark:text-sky-400",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    sectionLabel: "text-amber-700 dark:text-amber-400",
    sectionBorder: "border-amber-500",
    filterBox: "border-amber-500/20 bg-amber-500/5",
    heroCard:
      "border-amber-200/90 bg-gradient-to-br from-slate-50 via-white to-amber-50/60 dark:from-amber-950/40 dark:via-background dark:to-background",
    formHighlight: "border-amber-500/25 bg-amber-500/5",
    formSectionTitle: "text-amber-700 dark:text-amber-400",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-400",
    sectionLabel: "text-rose-700 dark:text-rose-400",
    sectionBorder: "border-rose-500",
    filterBox: "border-rose-500/20 bg-rose-500/5",
    heroCard:
      "border-rose-200/90 bg-gradient-to-br from-slate-50 via-white to-rose-50/60 dark:from-rose-950/40 dark:via-background dark:to-background",
    formHighlight: "border-rose-500/25 bg-rose-500/5",
    formSectionTitle: "text-rose-700 dark:text-rose-400",
  },
  slate: {
    icon: "text-slate-600 dark:text-slate-400",
    sectionLabel: "text-slate-700 dark:text-slate-400",
    sectionBorder: "border-slate-500",
    filterBox: "border-border/80 bg-muted/20",
    heroCard:
      "border-border/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/60 dark:from-background dark:via-background dark:to-background",
    formHighlight: "border-border/70 bg-muted/20",
    formSectionTitle: "text-muted-foreground",
  },
};

export function getDashboardAccentStyles(accent: DashboardAccent = "violet") {
  return ACCENT_STYLES[accent];
}

export function resolveDashboardAccent(pathname: string): DashboardAccent {
  const path = pathname.split("?")[0]!;
  if (path.startsWith("/dashboard/adm")) return "emerald";
  if (path.startsWith("/dashboard/futebol")) return "sky";
  if (path.startsWith("/dashboard/marketing")) return "amber";
  if (path.startsWith("/dashboard/juridico")) return "rose";
  if (
    path.startsWith("/dashboard/psicologia") ||
    path.startsWith("/dashboard/consultas") ||
    path.startsWith("/dashboard/saude") ||
    path.startsWith("/dashboard/medico")
  ) {
    return "violet";
  }
  if (path.startsWith("/dashboard/requisicoes")) return "slate";
  if (path.startsWith("/dashboard/eventos")) return "amber";
  return "violet";
}

export function dashboardAccentClass(accent: DashboardAccent, key: keyof (typeof ACCENT_STYLES)["violet"]) {
  return ACCENT_STYLES[accent][key];
}

export function dashboardStatToneClass(
  tone: "emerald" | "sky" | "amber" | "violet" | "rose" | "slate",
): string {
  const map = {
    emerald: "border-emerald-500/25 bg-emerald-500/5",
    sky: "border-sky-500/25 bg-sky-500/5",
    amber: "border-amber-500/25 bg-amber-500/5",
    violet: "border-violet-500/25 bg-violet-500/5",
    rose: "border-rose-500/25 bg-rose-500/5",
    slate: "border-border/80 bg-muted/20",
  };
  return map[tone];
}

export function cnAccent(accent: DashboardAccent, ...keys: Array<keyof (typeof ACCENT_STYLES)["violet"]>) {
  return cn(...keys.map((k) => ACCENT_STYLES[accent][k]));
}
