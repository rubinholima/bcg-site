/**
 * Padrão de cores do dashboard — sempre par claro + escuro (dark:).
 * Use estas classes em vez de violet/zinc fixos para o tema claro ficar legível.
 */
export const dash = {
  brandText:
    "text-violet-700 dark:text-violet-400",
  heroCard:
    "border-violet-200/90 bg-gradient-to-br from-slate-50 via-white to-violet-50/50 dark:border-violet-500/25 dark:from-violet-950/40 dark:via-background dark:to-background",
  shortcutFilled:
    "border border-violet-200 bg-violet-50 text-slate-900 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-950/30 dark:text-foreground dark:hover:border-violet-500/50 dark:hover:bg-violet-950/50",
  shortcutIcon: "text-violet-600 dark:text-violet-400",
  shortcutEmpty:
    "border border-dashed border-slate-300 text-slate-600 hover:border-violet-400 hover:bg-violet-50 hover:text-slate-900 dark:border-muted-foreground/35 dark:text-muted-foreground dark:hover:border-violet-500/40 dark:hover:bg-violet-950/20 dark:hover:text-foreground",
  calendarCard:
    "overflow-hidden border-violet-200/80 bg-gradient-to-b from-slate-50 to-white shadow-lg dark:border-violet-500/20 dark:from-violet-950/20 dark:via-background dark:to-background",
  calendarDay:
    "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50 dark:border-border/50 dark:bg-zinc-900/30 dark:hover:border-violet-500/25 dark:hover:bg-zinc-800/50",
  calendarDayToday:
    "border-violet-400 bg-violet-50 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/5 dark:hover:bg-violet-500/10",
  calendarDaySelected:
    "border-violet-500 bg-violet-100 ring-2 ring-violet-300 dark:border-violet-500/70 dark:bg-violet-500/15 dark:ring-violet-400/40",
  calendarDayNumberToday: "bg-violet-600 text-white dark:bg-violet-500",
  calendarDayNumberSelected:
    "bg-violet-200 text-violet-900 dark:bg-violet-500/30 dark:text-violet-100",
  calendarMore: "text-violet-700 dark:text-violet-300/90",
  eventListItem:
    "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50 dark:border-border/60 dark:bg-zinc-900/40 dark:hover:border-violet-500/35 dark:hover:bg-zinc-900/70",
  eventListTitle: "text-slate-900 group-hover:text-violet-800 dark:group-hover:text-violet-100",
  eventListMeta: "text-violet-700 dark:text-violet-200/90",
  sectionLabel: "text-violet-700 dark:text-violet-400/90",
  statChip:
    "border-slate-200 bg-white/90 dark:border-border/60 dark:bg-card/50",
  accentPanel:
    "border-violet-200 bg-violet-50/80 dark:border-violet-500/30 dark:bg-violet-500/5",
  accentPanelText: "text-violet-900 dark:text-violet-200",
} as const;
